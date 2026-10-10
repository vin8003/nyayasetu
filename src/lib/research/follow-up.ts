import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "@/lib/practice/sample";
import { intakeSchema, memoSchema } from "./schema";
import type { Intake, LegalMemo } from "./types";
import { parseResearchMemo } from "./parse-memo.ts";
import { stampPrecedents } from "./verify.ts";
import {
  FOLLOWUP_MAX_OUTPUT_TOKENS,
  FOLLOWUP_SYSTEM,
  FOLLOWUP_TIMEOUT_MS,
  buildFollowUpUser,
  mergeCitationUrls,
} from "./follow-up-prompt.ts";
import { RESEARCH_MIN_RETRY_MS, webResearchXaiBody } from "./prompt.ts";
import { researchModel } from "@/lib/ai/models";
import { sendWithFallback } from "@/lib/ai/retry";
import {
  XaiHttpError,
  asErrorMessage,
  collectFromOutput,
  type XaiResponse,
} from "@/lib/ai/xai-response";

export {
  FOLLOWUP_MAX_OUTPUT_TOKENS,
  FOLLOWUP_SYSTEM,
  FOLLOWUP_TIMEOUT_MS,
  buildFollowUpUser,
  followUpIntake,
  mergeCitationUrls,
} from "./follow-up-prompt.ts";

const followUpMemoSchema = memoSchema.extend({
  searchedQueries: z.array(z.string()).catch([]),
  citationUrls: z.array(z.string()).catch([]),
});

const followUpInputSchema = z.object({
  intake: intakeSchema,
  memo: followUpMemoSchema,
  question: z.string().trim().min(8).max(2000),
});

export const runFollowUp = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { intake: Intake; memo: LegalMemo; question: string }) => followUpInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; memo: LegalMemo } | { ok: false; error: string }> => {
    try {
      const gated = await gateAi(context.userId, { demo: looksLikeSample({ facts: data.intake.facts }) });
      if (!gated.ok) return gated;
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

      const user = buildFollowUpUser(data);
      const model = researchModel();
      const deadline = Date.now() + FOLLOWUP_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FOLLOWUP_TIMEOUT_MS);
      const queries: string[] = [];
      const retrieved: string[] = [];
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
        retrieved.push(...collected.urls);
        return collected.text;
      };
      let parsed;
      try {
        ({ value: parsed } = await sendWithFallback({
          tag: "follow-up",
          send: post,
          build: ({ legacy, repair }) =>
            webResearchXaiBody({
              model,
              instructions: FOLLOWUP_SYSTEM,
              user,
              maxOutputTokens: FOLLOWUP_MAX_OUTPUT_TOKENS,
              schemaName: "follow_up_memo",
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
      const collected = { queries: [...new Set(queries)], urls: [...new Set(retrieved)] };
      const urls = mergeCitationUrls(
        [...(data.memo.citationUrls ?? []), ...(data.memo.precedents ?? []).map((p) => p.url)],
        collected.urls,
      );
      const stamped = stampPrecedents(parsed.precedents, urls, parsed.unverified);
      const memo: LegalMemo = {
        ...parsed,
        precedents: stamped.precedents,
        unverified: stamped.unverified,
        searchedQueries: collected.queries,
        citationUrls: urls,
        title: parsed.title || data.memo.title || "Follow-up memo",
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
