import { z } from "zod";
import type { LetterGround } from "./types.ts";

const str = (max = 4000) => z.string().max(max).catch("");

export const letterDraftSchema = z.object({
  heading: str(240),
  parties: str(4000),
  facts: str(4000),
  grounds: z
    .array(
      z.object({
        heading: str(240),
        text: str(2000),
        citation: str(240),
        url: str(500),
      }),
    )
    .catch([]),
  closing: str(4000),
  timeOrStand: str(2000),
  verification: str(2000),
  risks: str(2000),
});

export type ParsedLetterDraft = z.infer<typeof letterDraftSchema>;

function unwrapFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? text).trim();
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("PARSE");
  const slice = text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  try {
    return JSON.parse(slice) as unknown;
  } catch {
    throw new Error("PARSE");
  }
}

function isSubstantial(draft: ParsedLetterDraft): boolean {
  if (draft.facts.trim().length >= 20) return true;
  if (draft.closing.trim().length >= 20) return true;
  if (draft.parties.trim().length >= 20) return true;
  if (draft.grounds.some((ground) => ground.text.trim() || ground.heading.trim())) return true;
  return false;
}

export function parseLetterDraft(text: string): ParsedLetterDraft {
  const raw = unwrapFence(text);
  if (!raw) throw new Error("PARSE");
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    json = extractJsonObject(raw);
  }
  let parsed: ParsedLetterDraft;
  try {
    parsed = letterDraftSchema.parse(json);
  } catch {
    throw new Error("PARSE");
  }
  if (!isSubstantial(parsed)) throw new Error("PARSE");
  return parsed;
}

export function asLetterGrounds(grounds: ParsedLetterDraft["grounds"]): LetterGround[] {
  return grounds.map((ground) => ({
    heading: ground.heading,
    text: ground.text,
    citation: ground.citation,
    url: ground.url,
  }));
}
