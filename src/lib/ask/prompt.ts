import { INDIAN_LAW_CONTEXT, langRule, todayLine } from "../ai/context.ts";
import { isReasoningModel } from "../ai/models.ts";
import { LEGAL_DOMAINS } from "../research/legal-domains.ts";

export const ASK_MAX_CONTEXT = 7000;
export const ASK_TIMEOUT_MS = 120_000;
export const ASK_MAX_OUTPUT_TOKENS = 1_800;
export const ASK_MAX_TOOL_CALLS = 4;

export type AskCase = {
  title: string;
  courtName: string;
  caseNumber: string;
  cnr: string;
  stage: string;
  ourSide: string;
  parties: string;
  notes: string;
  nextHearingOn: string;
  hearings: { listedOn: string; purpose: string; outcome: string }[];
  orders: { orderDate: string; confirmed: boolean; body: string }[];
  tasks: { title: string; status: string; dueOn: string }[];
  deadlines: { title: string; dueOn: string; status: string }[];
};

export function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, Math.max(0, max - 1))}…`;
}

/** Same authority rules as a research memo, written as a short chat reply. */
export function askSystem(lang: "en" | "hi"): string {
  return [
    "You are a senior Indian advocate answering a colleague in a short desk chat. This is not a full research memo.",
    langRule(lang),
    "Hard rules:",
    "- Indian law only. You MUST use web_search on Indian Kanoon, LiveLaw, CaseMine, eSCR (judgments.ecourts.gov.in) and sci.gov.in before you name a case, citation, or section.",
    "- Never invent a citation, case name, year, section number, or URL. If search does not return it, say you could not retrieve it. Do not guess.",
    "- Every case you name must be a markdown link to the page you retrieved, preferably indiankanoon.org/doc/…. No retrieved link means you do not name the case.",
    "- Name a section only when the retrieved page states it. Apply the statute in force on the date of the facts.",
    "- If a case file is attached, answer from that file and do not contradict it. An order is confirmed only when the file marks it CONFIRMED.",
    "- If no case file is attached, do not pretend one exists.",
    "- This is research assistance, not legal advice. Say so once, in one short line.",
    "Format in Markdown. Short answer first. Put each prayer, step, or label on its own line. Use **bold** for short labels only. Never run several lettered items on one line.",
    `Search only these domains: ${LEGAL_DOMAINS.join(", ")}. At most ${ASK_MAX_TOOL_CALLS} searches. Stop once the question has authority.`,
    INDIAN_LAW_CONTEXT,
  ].join("\n");
}

export function askCaseContext(file: AskCase | null): string {
  if (!file) {
    return "No case file is attached. This is a general question.";
  }
  const hearings = file.hearings
    .slice(0, 4)
    .map((h) => `- ${h.listedOn || "undated"}: ${clip(h.purpose, 160)}${h.outcome ? ` — ${clip(h.outcome, 200)}` : ""}`)
    .join("\n");
  const orders = file.orders
    .slice(0, 3)
    .map(
      (o) =>
        `- ${o.orderDate || "undated"} [${o.confirmed ? "CONFIRMED" : "UNCONFIRMED"}]: ${clip(o.body, 500)}`,
    )
    .join("\n");
  const tasks = file.tasks
    .filter((t) => t.status !== "done")
    .slice(0, 6)
    .map((t) => `- ${clip(t.title, 120)}${t.dueOn ? ` (due ${t.dueOn})` : ""}`)
    .join("\n");
  const deadlines = file.deadlines
    .filter((d) => d.status !== "done")
    .slice(0, 6)
    .map((d) => `- ${d.dueOn}: ${clip(d.title, 120)}`)
    .join("\n");
  const body = [
    "Case file (owned by this advocate; do not add facts that are not here):",
    `Title: ${clip(file.title, 200)}`,
    `Court: ${clip(file.courtName, 160)}`,
    `Case number: ${clip(file.caseNumber, 80)}`,
    `CNR: ${clip(file.cnr, 40)}`,
    `Stage: ${clip(file.stage, 80)}`,
    `Our side: ${clip(file.ourSide, 40)}`,
    `Parties:\n${clip(file.parties, 600) || "(none on file)"}`,
    `Next hearing: ${file.nextHearingOn || "(none on file)"}`,
    `Notes: ${clip(file.notes, 1200) || "(none)"}`,
    hearings ? `Recent hearings:\n${hearings}` : "Recent hearings: (none)",
    orders ? `Orders on file:\n${orders}` : "Orders on file: (none)",
    tasks ? `Open tasks:\n${tasks}` : "",
    deadlines ? `Open deadlines:\n${deadlines}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return body.length <= ASK_MAX_CONTEXT ? body : `${body.slice(0, ASK_MAX_CONTEXT - 1)}…`;
}

export function researchBrief(memo: {
  title?: string;
  causeTitle?: string;
  factsSummary?: string;
  fullMemo?: string;
  citationUrls?: string[];
  sources?: { url?: string }[];
}): { text: string; urls: string[] } {
  const urls = [...(memo.citationUrls ?? []), ...(memo.sources ?? []).map((source) => source.url ?? "")]
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http"));
  const unique = [...new Set(urls)].slice(0, 12);
  const text = [
    "A research memo is already on this chat. Continue it. Do not restart the matter or contradict the memo.",
    `Memo: ${clip(memo.title ?? "", 200)}`,
    memo.causeTitle ? `Cause: ${clip(memo.causeTitle, 200)}` : "",
    memo.factsSummary ? `Facts already found:\n${clip(memo.factsSummary, 900)}` : "",
    memo.fullMemo ? `Memo:\n${clip(memo.fullMemo, 2400)}` : "",
    unique.length ? `Retrieved for this memo. Reuse these URLs. Do not cite anything else unless you retrieve it now:\n${unique.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return { text, urls: unique };
}

export function askResponsesBody(opts: {
  model: string;
  lang: "en" | "hi";
  file: AskCase | null;
  messages: { role: "user" | "assistant"; content: string }[];
  priorSources?: string[];
  research?: string;
}) {
  const prior = (opts.priorSources ?? []).filter(Boolean);
  const preface = [
    todayLine(),
    askCaseContext(opts.file),
    opts.research ?? "",
    prior.length
      ? `Already retrieved this chat. You may reuse these URLs. Do not cite anything else unless you retrieve it now:\n${prior.join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    model: opts.model,
    instructions: askSystem(opts.lang),
    input: [{ role: "user" as const, content: preface }, ...opts.messages],
    tools: [{ type: "web_search" as const, filters: { allowed_domains: [...LEGAL_DOMAINS] } }],
    max_tool_calls: ASK_MAX_TOOL_CALLS,
    ...(isReasoningModel(opts.model) ? {} : { temperature: 0.2 }),
    max_output_tokens: ASK_MAX_OUTPUT_TOKENS,
  };
}
