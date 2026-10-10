import { citablePrecedentsFromMemo } from "./letter-cites.ts";
import { courtById } from "./courts.ts";
import type { Intake, LegalMemo, LetterKind } from "./types.ts";
import { INDIAN_LAW_CONTEXT, langRule, todayLine } from "../ai/context.ts";
import { DRAFTING_CONVENTIONS } from "../ai/drafting.ts";
import { DEFAULT_FAST_MODEL, fastModel } from "../ai/models.ts";
import { REPAIR_NOTE } from "../ai/retry.ts";
import { list, obj, responsesJsonFormat, str } from "../ai/schema.ts";

/** Hindi petitions run long in tokens; still well under the research budget. */
export const LETTER_TIMEOUT_MS = 60_000;
export const LETTER_MAX_OUTPUT_TOKENS = 6_000;
export const LETTER_MIN_RETRY_MS = 20_000;

export const LETTER_JSON_SCHEMA = obj({
  heading: str(),
  parties: str(),
  facts: str(),
  grounds: list(
    obj({
      heading: str(),
      text: str(),
      citation: str("reporter cite of a listed verified authority, or empty"),
      url: str("exact URL of that listed authority, or empty"),
    }),
  ),
  closing: str(),
  timeOrStand: str(),
  verification: str(),
  risks: str(),
});

export const LETTER_SYSTEM = `You are a senior Indian advocate drafting a notice, reply, court petition, or written statement for another advocate from an existing research memo.

Hard rules:
- Do not search the web. Do not use tools. Use only the facts, issues, and verified authorities in the user message.
- Cite only the verified authorities listed there. Never invent a case name, citation, year, or URL. If a proposition has no verified authority, write it without a case cite.
- Do not mention or rely on unverified or missing authorities.
- Keep case names, citations, and statute names in English even when the letter is in Hindi.
- This is research assistance, not legal advice. Put that once in risks or omit it from the JSON — the application will append the disclaimer.
- Write as a practising advocate files it: specific dates, amounts and names from the facts; numbered, self-contained paragraphs; no generic filler. Where a fact the draft needs is missing, write a bracketed placeholder like [date of notice] instead of inventing it.
- Each ground ties a specific fact to a specific provision or listed authority. 3–6 grounds.
- Return ONLY a JSON object. The first character of your reply must be {. No markdown, no labels, no preamble.

${INDIAN_LAW_CONTEXT}

{
  "heading": "short subject line or cause title",
  "parties": "From / To, or Petitioner / Respondent as known from the facts",
  "facts": "tight narrative of the facts used in the draft",
  "grounds": [{
    "heading": "one legal ground",
    "text": "how it applies, without new cases",
    "citation": "reporter cite of a listed verified authority, or empty",
    "url": "exact URL of that listed authority, or empty"
  }],
  "closing": "notice: the demand. reply: covering para-wise denial. petition: the petitioner prayer. writtenStatement: the prayer to dismiss or contest",
  "timeOrStand": "notice: time to comply. reply: the stand taken. petition: interim relief, or empty. writtenStatement: preliminary objections, or empty",
  "verification": "petition or writtenStatement: short verification clause. notice/reply: empty",
  "risks": "one line on litigation risk"
}`;

/** Body for POST https://api.x.ai/v1/responses (no tools). `legacy` is the pre-upgrade request. */
export function letterXaiBody(
  instructions: string,
  input: string,
  opts: { model?: string; legacy?: boolean; repair?: { previous: string } } = {},
) {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [{ role: "user", content: input }];
  if (opts.repair) {
    messages.push({ role: "assistant", content: opts.repair.previous.slice(0, 4000) });
    messages.push({ role: "user", content: REPAIR_NOTE });
  }
  return {
    model: opts.legacy ? DEFAULT_FAST_MODEL : (opts.model ?? fastModel()),
    instructions,
    input: messages,
    temperature: 0.2,
    max_output_tokens: LETTER_MAX_OUTPUT_TOKENS,
    text: opts.legacy
      ? { format: { type: "json_object" as const } }
      : responsesJsonFormat("legal_letter", LETTER_JSON_SCHEMA),
  };
}

export function buildLetterUser(opts: { kind: LetterKind; intake: Intake; memo: LegalMemo; now?: Date }): string {
  const { kind, intake, memo } = opts;
  const citable = citablePrecedentsFromMemo(memo);
  const authorities = citable.map((precedent) => ({
    title: precedent.title,
    citation: precedent.citation,
    court: precedent.court,
    year: precedent.year,
    ratio: precedent.ratio,
    url: precedent.url,
  }));
  const langLine = langRule(intake.lang);
  const kindLine: Record<LetterKind, string> = {
    notice:
      "Kind: legal notice. Write a demand and a time to comply. Do not use a without-prejudice reply shape, a court petition prayer, a written statement, or a verification clause.",
    reply:
      "Kind: reply to notice. Write a without prejudice, para-wise reply and the stand taken. Do not write a demand, a time to comply, a petition prayer, a written statement, or a verification clause.",
    petition:
      "Kind: court petition. Write a petition for filing: parties, facts, numbered grounds, prayer, optional interim relief, and a short verification clause. Do not write a legal notice, a without-prejudice reply, or a written statement.",
    writtenStatement:
      "Kind: written statement for filing. Write a respondent or defendant pleading: parties, additional facts, numbered para-wise reply grounds, optional preliminary objections, a prayer to dismiss or contest, and a short verification clause. Do not write a legal notice, a without-prejudice notice-reply, or a petitioner prayer for primary relief.",
  };

  const conventions = `Drafting conventions: ${DRAFTING_CONVENTIONS[kind]}`;
  const court = courtById(intake.courtId);
  const forumLine =
    court.kind === "all"
      ? `Forum: not specified — take the court from the cause title; do not invent one. Side: ${intake.side}. Practice area: ${intake.area}.`
      : `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Side: ${intake.side}. Practice area: ${intake.area}.`;
  const statuteLines =
    memo.statutes
      .filter((row) => row.name.trim())
      .map((row) => `- ${row.name} ${row.sections}: ${row.why}`)
      .join("\n") || "(none)";

  return [
    langLine,
    todayLine(opts.now),
    kindLine[kind],
    conventions,
    forumLine,
    `Cause title: ${memo.causeTitle.trim() || "(none)"}`,
    "",
    `Legal question:\n${intake.query.trim() || "(none)"}`,
    "",
    `Intake facts:\n${intake.facts.trim()}`,
    "",
    `Memo title: ${memo.title}`,
    `Statutes the memo relied on (do not treat these as case authorities):\n${statuteLines}`,
    `Facts summary:\n${memo.factsSummary || ""}`,
    `Issues:\n${memo.issues.map((issue) => `- ${issue.issue}`).join("\n") || "(none)"}`,
    `Submissions for the side:\n${memo.argumentsFor.map((item) => `- ${item}`).join("\n") || "(none)"}`,
    `Opposing submissions:\n${memo.argumentsAgainst.map((item) => `- ${item}`).join("\n") || "(none)"}`,
    `Answers to the opposing submissions:\n${memo.counters.map((item) => `- ${item}`).join("\n") || "(none)"}`,
    `Points the court will weigh:\n${
      memo.pointsForCourt
        .filter((row) => row.point.trim())
        .map((row) => `- ${row.point} (${row.strength})`)
        .join("\n") || "(none)"
    }`,
    `Strategy from the memo:\n${memo.strategy.trim().slice(0, 1200) || "(none)"}`,
    `Memo risks:\n${memo.risks.map((item) => `- ${item}`).join("\n") || "(none)"}`,
    "",
    "Verified authorities (the only cases you may cite; copy citation and url exactly):",
    JSON.stringify(authorities, null, 2),
  ].join("\n");
}
