import { LEGAL_DOMAINS } from "./legal-domains.ts";
import { MEMO_JSON_SCHEMA } from "./schema.ts";
import { INDIAN_LAW_CONTEXT, langRule, todayLine } from "../ai/context.ts";
import { DEFAULT_FAST_MODEL, isReasoningModel } from "../ai/models.ts";
import { REPAIR_NOTE } from "../ai/retry.ts";
import { responsesJsonFormat } from "../ai/schema.ts";
import { courtById } from "./courts.ts";
import type { Intake } from "./types.ts";

/** Reasoning plus up to six searches; paired with RESEARCH_MAX_OUTPUT_TOKENS so a long memo is not cut by the abort. */
export const RESEARCH_TIMEOUT_MS = 150_000;
export const RESEARCH_MAX_OUTPUT_TOKENS = 16_000;
export const RESEARCH_MAX_TOOL_CALLS = 6;
/** Below this much budget left, a PARSE repair retry is not attempted. */
export const RESEARCH_MIN_RETRY_MS = 45_000;

export const MEMO_JSON_SHAPE = `{
  "title": "short cause title",
  "causeTitle": "Party v. Party (forum)",
  "courtsConsulted": ["Supreme Court of India"],
  "factsSummary": "tight facts in brief, with dates",
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
  "strategy": "forum, limitation, pleadings, evidence, interim relief",
  "risks": ["..."],
  "fullMemo": "Complete written opinion in paragraphs, under 900 words. Headings as plain lines. Cite cases with URLs in parentheses.",
  "sources": [{"title": "", "url": "", "publisher": "Indian Kanoon|LiveLaw|eSCR|SCI|CaseMine"}],
  "unverified": []
}`;

export const MEMO_QUALITY_BAR = `Quality bar:
- issues: each a precise question of law the court must answer, not a topic.
- statutes: the exact sections that decide the issues, with why each matters. Use the law in force on the relevant date.
- precedents: 4–6 that you actually retrieved. ratio is the principle the judgment decides, from the judgment page, not a headnote guess. factsOverlap names the concrete shared facts. howToUse says where it goes (ground, reply, oral argument) and what it proves. binding is judged against the chosen forum: SC binds all; the forum's own High Court binds it; other High Courts are persuasive; mark distinguishable where the facts cut the other way.
- If search does not return a case for a point, cite fewer cases. Never pad the list. A precedent without a retrieved URL goes in unverified and keeps verified=false.
- argumentsAgainst: the strongest real points the other side will run, not straw men. counters answers them in the same order.
- pointsForCourt: what the bench will likely ask, with an honest strength rating.
- strategy: forum and maintainability, limitation, pleadings, documents and evidence to collect, interim relief.
- fullMemo: an opinion another advocate can rely on: short answer first, then issue-wise analysis, then next steps.`;

export const RESEARCH_SYSTEM = `You are a senior Indian advocate writing a research memo for another advocate.

Hard rules:
- Indian law only. You MUST use web_search on Indian Kanoon, LiveLaw, CaseMine, eSCR (judgments.ecourts.gov.in) and sci.gov.in.
- Never invent a citation, case name, year, or URL. If you cannot retrieve it, put it in unverified and set verified=false.
- Prefer indiankanoon.org/doc/… links. Supreme Court first, then the chosen High Court.
- This is research assistance, not legal advice. Say so once in fullMemo.

How to work:
1. Read the facts and frame the issues (including limitation and jurisdiction) before searching.
2. Plan targeted searches: statute + section + the decisive fact (e.g. "section 138 NI Act notice not received deemed service Supreme Court"). Prefer indiankanoon.org/doc/ results. Up to ${RESEARCH_MAX_TOOL_CALLS} searches; stop earlier once each issue has authority.
3. Write the memo only from what the searches returned.

${INDIAN_LAW_CONTEXT}

${MEMO_QUALITY_BAR}

Return ONLY a JSON object. The first character of your reply must be {. No markdown, no labels, no preamble.
${MEMO_JSON_SHAPE}
Search domains: ${LEGAL_DOMAINS.join(", ")}.`;

export function buildResearchUser(data: Intake, now: Date = new Date()): string {
  const court = courtById(data.courtId);
  const forumLine =
    court.kind === "all"
      ? "Forum: not specified — infer the proper forum from the facts and say so; search the Supreme Court first."
      : `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Always search Supreme Court as well if the forum is not SC.`;
  return [
    langRule(data.lang),
    todayLine(now),
    forumLine,
    `Practice area: ${data.area}. Perspective: ${data.side} — argue for this side, but be candid about weaknesses.`,
    "",
    `Legal question:\n${data.query.trim() || "(frame issues from the facts)"}`,
    "",
    `Facts:\n${data.facts.trim()}`,
  ].join("\n");
}

type ResponsesInput = Array<{ role: "user" | "assistant"; content: string }>;

/**
 * Body for POST https://api.x.ai/v1/responses with web_search. `legacy` is the
 * pre-upgrade request (fast model, json_object, three searches) used only if xAI
 * rejects the new shape.
 */
export function webResearchXaiBody(opts: {
  model: string;
  instructions: string;
  user: string;
  maxOutputTokens: number;
  schemaName: string;
  legacy?: boolean;
  repair?: { previous: string };
}) {
  const input: ResponsesInput = [{ role: "user", content: opts.user }];
  if (opts.repair) {
    input.push({ role: "assistant", content: opts.repair.previous.slice(0, 4000) });
    input.push({ role: "user", content: REPAIR_NOTE });
  }
  // A repair turn only reformats the previous reply, so it runs without search.
  const tools = opts.repair ? undefined : [{ type: "web_search", filters: { allowed_domains: [...LEGAL_DOMAINS] } }];
  if (opts.legacy) {
    return {
      model: DEFAULT_FAST_MODEL,
      instructions: opts.instructions,
      input,
      ...(tools ? { tools, max_tool_calls: 3 } : {}),
      temperature: 0.2,
      max_output_tokens: opts.maxOutputTokens,
      text: { format: { type: "json_object" as const } },
    };
  }
  return {
    model: opts.model,
    instructions: opts.instructions,
    input,
    ...(tools ? { tools, max_tool_calls: RESEARCH_MAX_TOOL_CALLS } : {}),
    ...(isReasoningModel(opts.model) ? {} : { temperature: 0.2 }),
    max_output_tokens: opts.maxOutputTokens,
    text: responsesJsonFormat(opts.schemaName, MEMO_JSON_SCHEMA),
  };
}
