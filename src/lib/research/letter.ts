import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { intakeSchema, memoSchema } from "./schema";
import type { Intake, LegalLetter, LegalMemo, LetterKind } from "./types";
import { assembleLetter } from "./letter-format.ts";
import { parseLetterDraft } from "./letter-parse.ts";
import {
  LETTER_SYSTEM,
  LETTER_TIMEOUT_MS,
  buildLetterUser,
  letterXaiBody,
} from "./letter-prompt.ts";

type XaiOutputItem = {
  type?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

type XaiResponse = {
  status?: string;
  error?: { message?: string } | string | null;
  output?: XaiOutputItem[];
  output_text?: string;
};

function collectText(data: XaiResponse): string {
  let text = data.output_text ?? "";
  for (const item of data.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.text) text += block.text;
      }
    }
  }
  return text;
}

function asErrorMessage(error: XaiResponse["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
}

const letterMemoSchema = memoSchema.extend({
  searchedQueries: z.array(z.string()).catch([]),
  citationUrls: z.array(z.string()).catch([]),
});

const letterInputSchema = z.object({
  kind: z.enum(["notice", "reply"]),
  intake: intakeSchema,
  memo: letterMemoSchema,
});

export const draftLetter = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: LetterKind; intake: Intake; memo: LegalMemo }) => letterInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; letter: LegalLetter } | { ok: false; error: string }> => {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

      const user = buildLetterUser({ kind: data.kind, intake: data.intake, memo: data.memo });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LETTER_TIMEOUT_MS);
      let text = "";
      try {
        const res = await fetch("https://api.x.ai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify(letterXaiBody(LETTER_SYSTEM, user)),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`xAI API error ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
        }
        const payload = (await res.json()) as XaiResponse;
        const err = asErrorMessage(payload.error);
        if (err) throw new Error(err);
        text = collectText(payload);
      } finally {
        clearTimeout(timer);
      }

      if (!text.trim()) return { ok: false, error: "PARSE" };
      let parsed;
      try {
        parsed = parseLetterDraft(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "PARSE") return { ok: false, error: "PARSE" };
        throw err;
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
