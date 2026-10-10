import { courtById } from "./courts.ts";
import { citablePrecedentsFromMemo, unverifiedCiteLabels } from "./letter-cites.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
import {
  MEMO_JSON_SHAPE,
  MEMO_QUALITY_BAR,
  RESEARCH_MAX_OUTPUT_TOKENS,
  RESEARCH_MAX_TOOL_CALLS,
  RESEARCH_TIMEOUT_MS,
} from "./prompt.ts";
import { INDIAN_LAW_CONTEXT, langRule, todayLine } from "../ai/context.ts";
import type { Intake, LegalMemo } from "./types.ts";

export const FOLLOWUP_TIMEOUT_MS = RESEARCH_TIMEOUT_MS;
export const FOLLOWUP_MAX_OUTPUT_TOKENS = RESEARCH_MAX_OUTPUT_TOKENS;

export const FOLLOWUP_SYSTEM = `You are a senior Indian advocate writing a follow-up research memo for another advocate.

Hard rules:
- This is a follow-up on an existing memo, not a new matter. Keep the same facts unless the follow-up question explicitly amends them.
- Indian law only. You MUST use web_search on Indian Kanoon, LiveLaw, CaseMine, eSCR (judgments.ecourts.gov.in) and sci.gov.in.
- Never invent a citation, case name, year, or URL. If you cannot retrieve it, put it in unverified and set verified=false.
- You may reuse the verified authorities listed in the user message. Do not cite names from the unverified list unless you newly retrieve a URL this run.
- Prefer indiankanoon.org/doc/… links. Supreme Court first, then the chosen High Court.
- This is research assistance, not legal advice. Say so once in fullMemo.

How to work:
1. Work out exactly what the follow-up changes: a new issue, a new fact, the other side's view, or a deeper point.
2. Search only for what the follow-up needs (up to ${RESEARCH_MAX_TOOL_CALLS} searches); reuse the verified authorities for everything else.
3. Return the whole memo updated for the follow-up. fullMemo opens with a direct answer to the follow-up question in its first paragraph; sections the follow-up does not touch stay short.

${INDIAN_LAW_CONTEXT}

${MEMO_QUALITY_BAR}

Return ONLY a JSON object. The first character of your reply must be {. No markdown, no labels, no preamble.
${MEMO_JSON_SHAPE.replace("Cite cases with URLs in parentheses.", "Cite cases with URLs in parentheses. Answer the follow-up directly.")}
Search domains: ${LEGAL_DOMAINS.join(", ")}.`;

export function mergeCitationUrls(parent: string[], retrieved: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const url of [...retrieved, ...parent]) {
    const trimmed = (url ?? "").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function followUpIntake(intake: Intake, question: string): Intake {
  return { ...intake, query: question.trim() };
}

export function buildFollowUpUser(opts: {
  intake: Intake;
  memo: LegalMemo;
  question: string;
  now?: Date;
}): string {
  const { intake, memo, question } = opts;
  const court = courtById(intake.courtId);
  const forumLine =
    court.kind === "all"
      ? "Forum: not specified — take the court from the cause title; do not invent one. Always search Supreme Court."
      : `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Always search Supreme Court as well if the forum is not SC.`;
  const verified = citablePrecedentsFromMemo(memo)
    .slice(0, 8)
    .map((row) => `- ${row.title} | ${row.citation} | ${row.url}${row.ratio ? ` | ratio: ${row.ratio.slice(0, 300)}` : ""}`)
    .join("\n");
  const banned = unverifiedCiteLabels(memo).slice(0, 12);
  const issues = (memo.issues ?? [])
    .slice(0, 8)
    .map((row) => `- ${row.issue}`)
    .join("\n");
  const priorStatutes = (memo.statutes ?? [])
    .filter((row) => row.name.trim())
    .slice(0, 8)
    .map((row) => `- ${row.name} ${row.sections}`.trim())
    .join("\n");
  return [
    langRule(intake.lang),
    todayLine(opts.now),
    forumLine,
    `Practice area: ${intake.area}. Perspective: ${intake.side}.`,
    "",
    "This is a follow-up. Do not restart the matter. Do not invent facts.",
    "",
    `Follow-up question:\n${question.trim()}`,
    "",
    `Original legal question:\n${intake.query.trim() || "(framed from the facts)"}`,
    "",
    `Facts (unchanged unless the follow-up amends them):\n${intake.facts.trim().slice(0, 8000)}`,
    "",
    `Prior memo: ${memo.title}`,
    `Cause title: ${memo.causeTitle.trim() || "(none)"}`,
    `Prior issues:\n${issues || "(none)"}`,
    `Prior facts summary:\n${(memo.factsSummary ?? "").slice(0, 1500)}`,
    `Prior statutes:\n${priorStatutes || "(none)"}`,
    `Prior strategy:\n${(memo.strategy ?? "").slice(0, 800) || "(none)"}`,
    `Prior opinion (excerpt):\n${(memo.fullMemo ?? "").slice(0, 1500) || "(none)"}`,
    "",
    `Verified authorities you may reuse (do not invent others):\n${verified || "(none retrieved)"}`,
    `Unverified names — do not cite unless you retrieve a URL this run:\n${banned.map((n) => `- ${n}`).join("\n") || "(none)"}`,
  ].join("\n");
}
