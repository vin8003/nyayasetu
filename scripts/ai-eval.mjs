#!/usr/bin/env node
// Live A/B of the research and letter prompts against xAI: the pre-upgrade request ("legacy")
// vs the current one, on the built-in sample briefs. Manual only — it spends API credit.
//
//   XAI_API_KEY=... node --experimental-strip-types scripts/ai-eval.mjs [--only=research|letter] [--samples=2]
//
// Prints one row per run: parse ok, repair retry used, latency, precedents found / verified,
// empty memo sections. Same endpoint, auth and request builders as the app.

import { SAMPLES } from "../src/lib/research/samples.ts";
import { RESEARCH_SYSTEM, buildResearchUser, webResearchXaiBody, RESEARCH_MAX_OUTPUT_TOKENS } from "../src/lib/research/prompt.ts";
import { LETTER_SYSTEM, buildLetterUser, letterXaiBody } from "../src/lib/research/letter-prompt.ts";
import { parseResearchMemo } from "../src/lib/research/parse-memo.ts";
import { parseLetterDraft } from "../src/lib/research/letter-parse.ts";
import { stampPrecedents } from "../src/lib/research/verify.ts";
import { researchModel, fastModel } from "../src/lib/ai/models.ts";
import { sendWithFallback } from "../src/lib/ai/retry.ts";
import { XaiHttpError, asErrorMessage, collectFromOutput } from "../src/lib/ai/xai-response.ts";

const apiKey = process.env.XAI_API_KEY;
if (!apiKey) {
  console.error("XAI_API_KEY is not set.");
  process.exit(1);
}
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [k, v] = arg.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const samples = SAMPLES.slice(0, Number(args.samples ?? 2));

async function post(body, sink) {
  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new XaiHttpError(res.status, await res.text().catch(() => ""));
  const payload = await res.json();
  const err = asErrorMessage(payload.error);
  if (err) throw new Error(err);
  const collected = collectFromOutput(payload);
  sink?.urls.push(...collected.urls);
  return collected.text;
}

const EMPTY_KEYS = ["issues", "statutes", "precedents", "argumentsFor", "argumentsAgainst", "counters", "risks"];

async function evalResearch(sample, variant) {
  const sink = { urls: [] };
  const started = Date.now();
  try {
    const { value: memo, retried, legacy } = await sendWithFallback({
      tag: "eval",
      send: (body) => post(body, sink),
      build: ({ legacy, repair }) =>
        webResearchXaiBody({
          model: researchModel(),
          instructions: RESEARCH_SYSTEM,
          user: buildResearchUser(sample.intake),
          maxOutputTokens: RESEARCH_MAX_OUTPUT_TOKENS,
          schemaName: "research_memo",
          legacy: variant === "legacy" || legacy,
          repair,
        }),
      parse: parseResearchMemo,
    });
    const stamped = stampPrecedents(memo.precedents, sink.urls, memo.unverified);
    return {
      action: "research",
      sample: sample.id,
      variant: legacy && variant !== "legacy" ? "current→legacy" : variant,
      ok: true,
      retried,
      seconds: Math.round((Date.now() - started) / 1000),
      precedents: memo.precedents.length,
      verified: stamped.precedents.filter((p) => p.verified).length,
      emptySections: EMPTY_KEYS.filter((k) => !memo[k]?.length).join(",") || "-",
      memoWords: memo.fullMemo.split(/\s+/).filter(Boolean).length,
      memo: { ...memo, precedents: stamped.precedents, citationUrls: sink.urls, searchedQueries: [] },
    };
  } catch (err) {
    return { action: "research", sample: sample.id, variant, ok: false, error: String(err.message ?? err).slice(0, 120), seconds: Math.round((Date.now() - started) / 1000) };
  }
}

async function evalLetter(sample, memo, variant) {
  const started = Date.now();
  try {
    const { value: draft, retried } = await sendWithFallback({
      tag: "eval",
      send: (body) => post(body),
      build: ({ legacy, repair }) =>
        letterXaiBody(LETTER_SYSTEM, buildLetterUser({ kind: "petition", intake: sample.intake, memo }), {
          model: fastModel(),
          legacy: variant === "legacy" || legacy,
          repair,
        }),
      parse: parseLetterDraft,
    });
    return {
      action: "letter",
      sample: sample.id,
      variant,
      ok: true,
      retried,
      seconds: Math.round((Date.now() - started) / 1000),
      grounds: draft.grounds.length,
      citedGrounds: draft.grounds.filter((g) => g.url).length,
      factsChars: draft.facts.length,
    };
  } catch (err) {
    return { action: "letter", sample: sample.id, variant, ok: false, error: String(err.message ?? err).slice(0, 120), seconds: Math.round((Date.now() - started) / 1000) };
  }
}

const rows = [];
for (const sample of samples) {
  for (const variant of ["legacy", "current"]) {
    let memo = null;
    if (args.only !== "letter") {
      const row = await evalResearch(sample, variant);
      memo = row.memo ?? null;
      delete row.memo;
      rows.push(row);
      console.error(JSON.stringify(row));
    }
    if (args.only !== "research" && memo) {
      const row = await evalLetter(sample, memo, variant);
      rows.push(row);
      console.error(JSON.stringify(row));
    }
  }
}
console.table(rows);
