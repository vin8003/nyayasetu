import { courtById } from "./courts.ts";
import { citablePrecedentsFromMemo, unverifiedCiteLabels } from "./letter-cites.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
import { RESEARCH_MAX_OUTPUT_TOKENS, RESEARCH_TIMEOUT_MS } from "./prompt.ts";
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
- Do at most three searches, then write the JSON immediately. Search only for what the follow-up actually needs.

Return ONLY a JSON object. The first character of your reply must be {. No markdown, no labels, no preamble.
{
  "title": "short cause title",
  "causeTitle": "Party v. Party (forum)",
  "courtsConsulted": ["Supreme Court of India"],
  "factsSummary": "tight facts in brief",
  "issues": [{"issue": "...", "framing": "how the court would frame it"}],
  "statutes": [{"name": "", "sections": "", "why": "", "url": ""}],
  "doctrines": [{"name": "", "explanation": "", "leadingCase": ""}],
  "precedents": [{
    "title": "", "citation": "", "court": "", "year": "",
    "ratio": "", "factsOverlap": "", "holding": "", "howToUse": "",
    "url": "", "binding": "binding"|"persuasive"|"distinguishable", "verified": false
  }],
  "pointsForCourt": [{"point": "", "likelyOutcome": "", "strength": "strong"|"moderate"|"contested"}],
  "argumentsFor": ["..."],
  "argumentsAgainst": ["..."],
  "counters": ["..."],
  "strategy": "forum, pleadings, evidence, interim relief",
  "risks": ["..."],
  "fullMemo": "Complete written opinion in paragraphs, under 800 words. Headings as plain lines. Cite cases with URLs in parentheses. Answer the follow-up directly.",
  "sources": [{"title": "", "url": "", "publisher": "Indian Kanoon|LiveLaw|eSCR|SCI|CaseMine"}],
  "unverified": []
}
4–6 precedents is enough. Search domains: ${LEGAL_DOMAINS.join(", ")}.`;

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

export function buildFollowUpUser(opts: { intake: Intake; memo: LegalMemo; question: string }): string {
  const { intake, memo, question } = opts;
  const court = courtById(intake.courtId);
  const langLine =
    intake.lang === "hi"
      ? "Output language: Hindi (keep case names, citations and statutes in English)."
      : "Output language: English.";
  const forumLine =
    court.kind === "all"
      ? "Forum: not specified — take the court from the cause title; do not invent one. Always search Supreme Court."
      : `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Always search Supreme Court as well if the forum is not SC.`;
  const verified = citablePrecedentsFromMemo(memo)
    .slice(0, 8)
    .map((row) => `- ${row.title} | ${row.citation} | ${row.url}`)
    .join("\n");
  const banned = unverifiedCiteLabels(memo).slice(0, 12);
  const issues = (memo.issues ?? [])
    .slice(0, 8)
    .map((row) => `- ${row.issue}`)
    .join("\n");
  return [
    langLine,
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
    "",
    `Verified authorities you may reuse (do not invent others):\n${verified || "(none retrieved)"}`,
    `Unverified names — do not cite unless you retrieve a URL this run:\n${banned.map((n) => `- ${n}`).join("\n") || "(none)"}`,
  ].join("\n");
}
