import { memoSchema } from "./schema.ts";
import type { z } from "zod";

export type ParsedMemo = z.infer<typeof memoSchema>;

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

function isSubstantial(memo: ParsedMemo): boolean {
  if (!memo.title.trim()) return false;
  if (memo.issues.some((issue) => issue.issue.trim())) return true;
  if (memo.precedents.some((precedent) => precedent.title.trim() || precedent.citation.trim())) return true;
  return memo.fullMemo.trim().length >= 40;
}

export function parseResearchMemo(text: string): ParsedMemo {
  const raw = unwrapFence(text);
  if (!raw) throw new Error("PARSE");
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    json = extractJsonObject(raw);
  }
  let parsed: ParsedMemo;
  try {
    parsed = memoSchema.parse(json);
  } catch {
    throw new Error("PARSE");
  }
  if (!isSubstantial(parsed)) throw new Error("PARSE");
  return parsed;
}
