import { COURTS } from "../research/courts.ts";
import {
  PRACTICE_AREAS,
  type Intake,
  type OutputLang,
  type PracticeArea,
  type Side,
} from "../research/types.ts";
import { stageDef } from "./workflow.ts";
import type { Matter, MatterBundle } from "./types.ts";

const AREA_BY_PROCEEDING: Record<string, PracticeArea> = {
  civil: "civil",
  commercial: "civil",
  criminal: "criminal",
  writ: "writ",
  appellate: "civil",
  family: "family",
  consumer: "consumer",
  arbitration: "arbitration",
  execution: "civil",
};

export function mapCourtId(courtName: string): string {
  const n = courtName.toLowerCase();
  if (!n.trim()) return "all";
  if (/\bsupreme\b/.test(n)) return "sc";
  const aliases: Array<[RegExp, string]> = [
    [/nclat|nclt/, "nclat"],
    [/\bitat\b/, "itat"],
    [/\bcat\b|administrative tribunal/, "cat"],
    [/ncdrc|consumer (disputes|commission)/, "ncdrc"],
    [/\bsat\b|securities appellate/, "sat"],
    [/\bdrt\b|\bdrat\b|debt recovery/, "drt"],
    [/\bngt\b|green tribunal/, "ngt"],
    [/delhi/, "delhi"],
    [/bombay|mumbai/, "bombay"],
    [/calcutta|kolkata/, "calcutta"],
    [/madras|chennai/, "madras"],
    [/allahabad|lucknow|prayagraj/, "allahabad"],
    [/rajasthan|jaipur|jodhpur/, "rajasthan"],
    [/punjab|haryana|chandigarh/, "punjab"],
    [/karnataka|bengaluru|bangalore/, "karnataka"],
    [/kerala|ernakulam|kochi/, "kerala"],
    [/gujarat|ahmedabad/, "gujarat"],
    [/madhya pradesh|\bmp\b|jabalpur|indore|gwalior/, "mp"],
    [/patna|bihar/, "patna"],
    [/orissa|odisha|cuttack/, "orissa"],
    [/andhra/, "andhra"],
    [/telangana|hyderabad/, "telangana"],
    [/chhattisgarh|bilaspur/, "chhattisgarh"],
    [/jharkhand|ranchi/, "jharkhand"],
    [/uttarakhand|nainital/, "uttarakhand"],
    [/himachal|\bhp\b|shimla/, "hp"],
    [/jammu|kashmir|ladakh|\bjk\b/, "jk"],
    [/gauhati|guwahati|assam/, "gauhati"],
    [/manipur/, "manipur"],
    [/meghalaya/, "meghalaya"],
    [/tripura/, "tripura"],
    [/sikkim/, "sikkim"],
  ];
  for (const [re, id] of aliases) {
    if (re.test(n) && COURTS.some((c) => c.id === id)) return id;
  }
  for (const court of COURTS) {
    if (court.id === "all") continue;
    if (n.includes(court.name.toLowerCase())) return court.id;
  }
  return "all";
}

export function mapPracticeArea(proceeding: string): PracticeArea {
  const mapped = AREA_BY_PROCEEDING[proceeding];
  if (mapped && (PRACTICE_AREAS as readonly string[]).includes(mapped)) return mapped;
  return "other";
}

export function mapSide(ourSide: string): Side {
  if (ourSide === "petitioner" || ourSide === "appellant" || ourSide === "complainant") {
    return "petitioner";
  }
  if (ourSide === "respondent" || ourSide === "accused") return "respondent";
  return "neutral";
}

function line(label: string, value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v ? `${label}: ${v}` : null;
}

export function extractResearchQuestion(notes: string): string {
  const m = notes.match(/Research question:\s*([\s\S]+?)(?:\n\n|Issues for research:|$)/i);
  return (m?.[1] ?? "").trim().replace(/\s+/g, " ");
}

export function intakeFromMatter(
  bundle: Pick<MatterBundle, "matter"> & Partial<MatterBundle>,
  lang: OutputLang = "en",
): Intake {
  const matter: Matter = bundle.matter;
  const stage = stageDef(matter.proceeding, matter.stage);
  const stageLabel = stage?.label ?? matter.stage;
  const parties = (matter.parties ?? [])
    .map((p) => `${p.role}: ${p.name}`)
    .filter((s) => s.replace(/: /g, "").trim())
    .join("\n");
  const hearings = (bundle.hearings ?? [])
    .map((h) => [h.listedOn, h.listedAt, h.purpose, h.outcome].filter(Boolean).join(" "))
    .filter(Boolean);
  const deadlines = (bundle.deadlines ?? [])
    .filter((d) => d.status !== "done" && d.status !== "dropped")
    .map((d) => `${d.dueOn} — ${d.title}`);
  const tasks = (bundle.tasks ?? [])
    .filter((t) => t.status === "open")
    .map((t) => [t.dueOn, t.title].filter(Boolean).join(" — "));
  const lastOrder = (bundle.orders ?? [])[0]?.body?.trim();
  const documents = (bundle.documents ?? [])
    .filter((d) => (d.text ?? "").trim())
    .slice(0, 5)
    .map((d) => `${d.title}${d.kind ? ` (${d.kind})` : ""}:\n${d.text.trim().slice(0, 1800)}`);

  const facts = [
    line("Matter", matter.title),
    line("Court", matter.courtName),
    line("Case number", matter.caseNumber),
    line("CNR", matter.cnr),
    line("Case type", matter.caseType),
    line("Jurisdiction", matter.jurisdiction),
    line("Proceeding", `${matter.proceeding}${stageLabel ? ` · ${stageLabel}` : ""}`),
    line("Our side", matter.ourSide),
    line("Client", matter.clientName),
    parties ? `Parties:\n${parties}` : null,
    line("Next hearing", matter.nextHearingOn),
    line("Last order date", matter.lastOrderOn),
    hearings.length ? `Hearings:\n${hearings.join("\n")}` : null,
    deadlines.length ? `Open deadlines:\n${deadlines.join("\n")}` : null,
    tasks.length ? `Open tasks:\n${tasks.join("\n")}` : null,
    matter.notes?.trim() ? `Facts / notes:\n${matter.notes.trim()}` : null,
    documents.length ? `Case papers:\n${documents.join("\n\n")}` : null,
    lastOrder ? `Last order (extract):\n${lastOrder.slice(0, 2500)}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const extracted = extractResearchQuestion(matter.notes ?? "");
  const query =
    extracted.length >= 40
      ? extracted.slice(0, 400)
      : `Authorities and arguments for ${matter.title} at the ${stageLabel} stage.`;

  return {
    facts: facts.slice(0, 20000),
    query,
    courtId: mapCourtId(matter.courtName),
    area: mapPracticeArea(matter.proceeding),
    side: mapSide(matter.ourSide),
    lang,
  };
}
