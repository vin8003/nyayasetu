import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "@/lib/practice/sample";
import { intakeSchema, memoSchema } from "./schema";
import { LETTER_KINDS, type Intake, type LegalLetter, type LegalMemo, type LetterKind } from "./types";
import { assembleLetter } from "./letter-format.ts";
import { parseLetterDraft } from "./letter-parse.ts";
import {
  LETTER_MIN_RETRY_MS,
  LETTER_SYSTEM,
  LETTER_TIMEOUT_MS,
  buildLetterUser,
  letterXaiBody,
} from "./letter-prompt.ts";
import { fastModel } from "@/lib/ai/models";
import { sendWithFallback } from "@/lib/ai/retry";
import {
  XaiHttpError,
  asErrorMessage,
  collectFromOutput,
  type XaiResponse,
} from "@/lib/ai/xai-response";

const letterMemoSchema = memoSchema.extend({
  searchedQueries: z.array(z.string()).catch([]),
  citationUrls: z.array(z.string()).catch([]),
});

const letterInputSchema = z.object({
  kind: z.enum(LETTER_KINDS),
  intake: intakeSchema,
  memo: letterMemoSchema,
});

export const draftLetter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: LetterKind; intake: Intake; memo: LegalMemo }) => letterInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; letter: LegalLetter } | { ok: false; error: string }> => {
    try {
      const gated = await gateAi(context.userId, { demo: looksLikeSample({ facts: data.intake.facts }) });
      if (!gated.ok) return gated;
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

      const user = buildLetterUser({ kind: data.kind, intake: data.intake, memo: data.memo });
      const model = fastModel();
      const deadline = Date.now() + LETTER_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LETTER_TIMEOUT_MS);
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
        return collectFromOutput(payload).text;
      };

      let parsed;
      try {
        ({ value: parsed } = await sendWithFallback({
          tag: "letter",
          send: post,
          build: ({ legacy, repair }) => letterXaiBody(LETTER_SYSTEM, user, { model, legacy, repair }),
          parse: parseLetterDraft,
          deadline,
          minRetryMs: LETTER_MIN_RETRY_MS,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "PARSE") return { ok: false, error: "PARSE" };
        throw err;
      } finally {
        clearTimeout(timer);
      }
      const letter = assembleLetter({
        kind: data.kind,
        lang: data.intake.lang,
        draft: parsed,
        memo: data.memo,
      });
      return { ok: true, letter };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("abort") || message.toLowerCase().includes("timeout")) {
        return { ok: false, error: "TIMEOUT" };
      }
      if (message === "PARSE" || message.includes("JSON")) return { ok: false, error: "PARSE" };
      return { ok: false, error: message };
    }
  });
