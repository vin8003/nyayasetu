import type { MatterBundle, Task } from "./types.ts";

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

function lastOrderText(bundle: MatterBundle): string {
  const order = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
  return (order?.body ?? "").trim().slice(0, 1200);
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
  switch (kind) {
    case "writtenStatement":
      return "Write a written statement: preliminary objections first, then a para-wise reply, then prayer and verification. Do not admit the claim.";
    case "reply":
      return "Write a without-prejudice reply to a notice. Para-wise. No demand. No verification.";
    case "notice":
      return "Write a legal notice: facts, demand, time to comply. No verification.";
    case "petition":
      return "Write a court petition: grounds, prayer, optional interim relief, verification. No invented citations.";
    case "affidavit":
      return "Write a sworn affidavit in the first person. Only facts the deponent can swear from this file. Dates and names from the papers.";
    case "note":
      return "Write a one-page court note / oral-argument brief. Issues, the authority to distinguish, the ask. No prayer clause required.";
    default:
      return "Write an interlocutory application: facts, the order being complied with, grounds, prayer.";
  }
}

export function filePrompt(
  bundle: MatterBundle,
  item: { title: string; sourceQuote: string; dueOn: string | null },
  kind: TaskDraftKind,
  lang: "en" | "hi",
): string {
  const docs = (bundle.documents ?? [])
    .map((d) => `- ${d.title}`)
    .slice(0, 8)
    .join("\n");
  const langLine =
    lang === "hi"
      ? "Output language: Hindi (keep case names, statutes and citations in English)."
      : "Output language: English.";
  return [
    langLine,
    `Kind: ${kind}. ${kindInstruction(kind)}`,
    `Task: ${item.title}`,
    item.dueOn ? `Due: ${item.dueOn}` : "",
    item.sourceQuote ? `Source quote: ${item.sourceQuote}` : "",
    `Matter: ${bundle.matter.title}`,
    `Court: ${bundle.matter.courtName} ${bundle.matter.caseNumber}`,
    `Stage: ${bundle.matter.stage}. Our side: ${bundle.matter.ourSide}.`,
    `Parties:\n${partiesLine(bundle)}`,
    `Notes:\n${(bundle.matter.notes ?? "").slice(0, 2500)}`,
    `Last order:\n${lastOrderText(bundle) || "(none)"}`,
    docs ? `Papers on file:\n${docs}` : "",
    "Use only this file. Do not invent a citation, date, or party. If a fact is missing, say so in caveats.",
    "This is research assistance, not legal advice.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
