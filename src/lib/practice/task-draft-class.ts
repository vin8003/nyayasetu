import type { MatterBundle, Task } from "./types.ts";
import { langRule, todayLine } from "../ai/context.ts";
import { DRAFTING_CONVENTIONS } from "../ai/drafting.ts";

export const TASK_DRAFT_KINDS = [
  "writtenStatement",
  "reply",
  "notice",
  "petition",
  "application",
  "affidavit",
  "note",
] as const;
export type TaskDraftKind = (typeof TASK_DRAFT_KINDS)[number];

export type DraftClass =
  | { draftable: true; kind: TaskDraftKind }
  | { draftable: false; reason: "notADocument" };

export type TaskDraft = {
  kind: TaskDraftKind;
  title: string;
  heading: string;
  parties: string;
  body: string;
  prayer: string;
  verification: string;
  caveats: string[];
};

const NOT_A_DOC =
  /\b(diary|watch|do not take|keep father|keep .{0,40} in court|compile the|get the |confirm whether)\b/i;

const KIND_PATTERNS: Array<[RegExp, TaskDraftKind]> = [
  [/written statement|\bws\b|order\s*viii|o\.?\s*8\s*r|लिखित कथन/i, "writtenStatement"],
  [/process[- ]server affidavit|affidavit of|\baffidavit\b|शपथ/i, "affidavit"],
  [/para[- ]wise reply|reply to (the )?notice|\breply\b/i, "reply"],
  [/legal notice|statutory notice|demand notice/i, "notice"],
  [/short note|oral .{0,20}arguments|written submissions|distinguishing/i, "note"],
  [/summary judgment|xiii-?a|\bi\.?a\.?\b|interlocutory|stay of|condonation|\bapplication\b/i, "application"],
  [/\bbail\b|anticipatory|default[- ]bail|\bwrit\b|mandamus|certiorari|\bslp\b|याचिका|\bpetition\b/i, "petition"],
  [/\bdraft\b|\bfile\b/i, "application"],
];

export function classifyTaskDraft(title: string, quote = ""): DraftClass {
  const heading = title.trim();
  if (!heading) return { draftable: false, reason: "notADocument" };
  if (NOT_A_DOC.test(heading)) return { draftable: false, reason: "notADocument" };
  const blob = `${heading}\n${quote}`;
  for (const [re, kind] of KIND_PATTERNS) {
    if (re.test(blob)) return { draftable: true, kind };
  }
  return { draftable: false, reason: "notADocument" };
}

export function compactDraft(lines: string[]): string {
  return lines.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n").trim();
}

export function formatTaskDraft(draft: TaskDraft): string {
  return compactDraft([
    draft.heading || draft.title,
    draft.parties,
    "",
    draft.body,
    "",
    draft.prayer ? "PRAYER" : "",
    draft.prayer,
    "",
    draft.verification ? "VERIFICATION" : "",
    draft.verification,
    "",
    draft.caveats.length ? "Caveats — check the file before you file this. Not legal advice." : "",
    ...draft.caveats.map((row) => `• ${row}`),
  ]);
}

function partiesLine(bundle: MatterBundle): string {
  const parties = bundle.matter.parties ?? [];
  if (!parties.length) return bundle.matter.title;
  return parties.map((p) => `${p.role}: ${p.name}`).join("\n");
}

function lastOrderText(bundle: MatterBundle, max = 1200): string {
  const order = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
  return (order?.body ?? "").trim().slice(0, max);
}

export function draftFromBundle(
  bundle: MatterBundle,
  item: Pick<Task, "title" | "sourceQuote" | "dueOn">,
  kind: TaskDraftKind,
): TaskDraft {
  const matter = bundle.matter;
  const due = item.dueOn ? ` Due ${item.dueOn}.` : "";
  const quote = item.sourceQuote.trim();
  const notes = (matter.notes ?? "").trim().slice(0, 1200);
  const order = lastOrderText(bundle);
  const heading = `${matter.courtName || "Court"} · ${matter.caseNumber || matter.title}`;
  const body = compactDraft([
    `This draft is for: ${item.title}.${due}`,
    quote ? `From the file: ${quote}` : "",
    notes ? `Facts on the file:\n${notes}` : "",
    order ? `Last order on record:\n${order}` : "",
    kind === "writtenStatement"
      ? "Reserve limitation, maintainability and a para-wise reply. Do not admit the claim."
      : kind === "affidavit"
        ? "State only what the deponent can swear from the papers. Dates and names from the file only."
        : kind === "note"
          ? "One-page note for court: issues, the order to distinguish, and the ask."
          : kind === "petition"
            ? "Frame the relief from the facts on this file. Do not invent a citation."
            : "Set out the facts, the direction being complied with, and the prayer.",
  ]);
  return {
    kind,
    title: item.title.slice(0, 180),
    heading,
    parties: partiesLine(bundle),
    body,
    prayer:
      kind === "note"
        ? ""
        : kind === "writtenStatement"
          ? "Dismiss the suit / reject the plaint in terms of the preliminary objections; costs."
          : kind === "affidavit"
            ? ""
            : "Grant the relief sought in this draft, and pass such further orders as the court deems fit.",
    verification:
      kind === "affidavit" || kind === "writtenStatement" || kind === "petition"
        ? "I am the deponent / authorised signatory. What is stated is true to my knowledge from the papers, and nothing material is concealed."
        : "",
    caveats: [
      "Built from the papers on this file. Check names, dates and the last order before filing.",
      "Not legal advice.",
    ],
  };
}

export function kindInstruction(kind: TaskDraftKind): string {
  return DRAFTING_CONVENTIONS[kind];
}

export function filePrompt(
  bundle: MatterBundle,
  item: { title: string; sourceQuote: string; dueOn: string | null },
  kind: TaskDraftKind,
  lang: "en" | "hi",
  now: Date = new Date(),
): string {
  const docs = (bundle.documents ?? [])
    .map((d) => `- ${d.title}`)
    .slice(0, 8)
    .join("\n");
  const order = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
  const directions = (order?.directions ?? [])
    .map((d) => (typeof d === "string" ? d : d.text || d.quote || ""))
    .filter(Boolean)
    .map((d) => `- ${d}`)
    .join("\n");
  return [
    langRule(lang),
    todayLine(now),
    `Kind: ${kind}. ${kindInstruction(kind)}`,
    `Task: ${item.title}`,
    item.dueOn ? `Due: ${item.dueOn}` : "",
    item.sourceQuote ? `Source quote: ${item.sourceQuote}` : "",
    `Matter: ${bundle.matter.title}`,
    `Court: ${bundle.matter.courtName} ${bundle.matter.caseNumber}`,
    `Stage: ${bundle.matter.stage}. Our side: ${bundle.matter.ourSide}.`,
    `Parties:\n${partiesLine(bundle)}`,
    `Notes:\n${(bundle.matter.notes ?? "").slice(0, 5000)}`,
    `Last order:\n${lastOrderText(bundle, 3000) || "(none)"}`,
    directions ? `Directions in the last order:\n${directions}` : "",
    docs ? `Papers on file:\n${docs}` : "",
    "Use only this file. Do not invent a citation, date, or party. Where the draft needs a fact the file does not have, put a bracketed placeholder like [date of service] in the draft and list it in caveats.",
    "Draft the full document ready for the advocate to settle: numbered paragraphs, the matter's real names, dates and numbers, and the direction or task it responds to.",
    "This is research assistance, not legal advice.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
