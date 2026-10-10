import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "@/lib/practice/sample";
import { intakeSchema } from "./schema";
import type { Intake, LegalMemo } from "./types";
import { parseResearchMemo } from "./parse-memo.ts";
import {
  RESEARCH_MAX_OUTPUT_TOKENS,
  RESEARCH_MIN_RETRY_MS,
  RESEARCH_SYSTEM,
  RESEARCH_TIMEOUT_MS,
  buildResearchUser,
  webResearchXaiBody,
} from "./prompt.ts";
import { stampPrecedents } from "./verify.ts";
import { researchModel } from "@/lib/ai/models";
import { sendWithFallback } from "@/lib/ai/retry";
import {
  XaiHttpError,
  asErrorMessage,
  collectFromOutput,
  type XaiResponse,
} from "@/lib/ai/xai-response";

export const runResearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Intake) => intakeSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; memo: LegalMemo } | { ok: false; error: string }> => {
    try {
      const gated = await gateAi(context.userId, { demo: looksLikeSample({ facts: data.facts }) });
      if (!gated.ok) return gated;
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

      const user = buildResearchUser(data);
      const model = researchModel();
      const deadline = Date.now() + RESEARCH_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), RESEARCH_TIMEOUT_MS);
      const queries: string[] = [];
      const urls: string[] = [];
      const post = async (body: object): Promise<string> => {
        const res = await fetch("https://api.x.ai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new XaiHttpError(res.status, await res.text().catch(() => ""));
        const payload = (await res.json()) as XaiResponse;
        const err = asErrorMessage(payload.error);
        if (err) throw new Error(err);
        const collected = collectFromOutput(payload);
        queries.push(...collected.queries);
        urls.push(...collected.urls);
        return collected.text;
      };
      let parsed;
      try {
        ({ value: parsed } = await sendWithFallback({
          tag: "research",
          send: post,
          build: ({ legacy, repair }) =>
            webResearchXaiBody({
              model,
              instructions: RESEARCH_SYSTEM,
              user,
              maxOutputTokens: RESEARCH_MAX_OUTPUT_TOKENS,
              schemaName: "research_memo",
              legacy,
              repair,
            }),
          parse: parseResearchMemo,
          deadline,
          minRetryMs: RESEARCH_MIN_RETRY_MS,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "PARSE") return { ok: false, error: "PARSE" };
        throw err;
      } finally {
        clearTimeout(timer);
      }
      const collected = { queries: [...new Set(queries)], urls: [...new Set(urls)] };
      const stamped = stampPrecedents(parsed.precedents, collected.urls, parsed.unverified);
      const memo: LegalMemo = {
        ...parsed,
        precedents: stamped.precedents,
        unverified: stamped.unverified,
        searchedQueries: collected.queries,
        citationUrls: collected.urls,
        title: parsed.title || "Legal research memo",
        fullMemo: parsed.fullMemo,
      };
      return { ok: true, memo };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "AI_UNAVAILABLE") return { ok: false, error: "AI_UNAVAILABLE" };
      if (message.includes("abort") || message.toLowerCase().includes("timeout")) {
        return { ok: false, error: "TIMEOUT" };
      }
      if (message === "PARSE" || message.includes("JSON")) return { ok: false, error: "PARSE" };
      return { ok: false, error: message };
    }
  });
