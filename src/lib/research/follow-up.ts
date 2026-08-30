import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "@/lib/practice/sample";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
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

export {
  FOLLOWUP_MAX_OUTPUT_TOKENS,
  FOLLOWUP_SYSTEM,
  FOLLOWUP_TIMEOUT_MS,
  buildFollowUpUser,
  followUpIntake,
  mergeCitationUrls,
} from "./follow-up-prompt.ts";

type XaiOutputItem = {
  type?: string;
  action?: { query?: string; type?: string };
  queries?: string[];
  content?: Array<{
    type?: string;
    text?: string;
    annotations?: Array<{ url?: string }>;
  }>;
};

type XaiResponse = {
  status?: string;
  error?: { message?: string } | string | null;
  output?: XaiOutputItem[];
  citations?: string[];
  output_text?: string;
};

function collectFromOutput(data: XaiResponse): { text: string; queries: string[]; urls: string[] } {
  const queries: string[] = [];
  const urls = new Set<string>(data.citations ?? []);
  let text = data.output_text ?? "";
  for (const item of data.output ?? []) {
    if (item.action?.query) queries.push(item.action.query);
    if (Array.isArray(item.queries)) queries.push(...item.queries);
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.text) text += block.text;
        for (const ann of block.annotations ?? []) {
          if (ann.url) urls.add(ann.url);
        }
      }
    }
  }
  return { text, queries: [...new Set(queries)], urls: [...urls] };
}

function asErrorMessage(error: XaiResponse["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
}

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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FOLLOWUP_TIMEOUT_MS);
      let collected: { text: string; queries: string[]; urls: string[] };
      try {
        const res = await fetch("https://api.x.ai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "grok-4.20-0309-non-reasoning",
            instructions: FOLLOWUP_SYSTEM,
            input: [{ role: "user", content: user }],
            tools: [
              {
                type: "web_search",
                filters: { allowed_domains: [...LEGAL_DOMAINS] },
              },
            ],
            temperature: 0.2,
            max_output_tokens: FOLLOWUP_MAX_OUTPUT_TOKENS,
            max_tool_calls: 3,
            text: { format: { type: "json_object" } },
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`xAI API error ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
        }
        const payload = (await res.json()) as XaiResponse;
        const err = asErrorMessage(payload.error);
        if (err) throw new Error(err);
        collected = collectFromOutput(payload);
      } finally {
        clearTimeout(timer);
      }

      if (!collected.text.trim()) return { ok: false, error: "PARSE" };
      let parsed;
      try {
        parsed = parseResearchMemo(collected.text);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "PARSE") return { ok: false, error: "PARSE" };
        throw err;
      }
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
