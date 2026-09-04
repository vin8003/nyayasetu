import { firstDateIn, parseIndianDate } from "./dates.ts";
import { normalizeCnr } from "./hash.ts";
import { captionFromParties, proceedingFromCaseType, stageFromCourtStage } from "./proceeding.ts";
import type { NormalizedCase, NormalizedOrder } from "./types.ts";
import type { Party } from "@/lib/practice/types";

function field(text: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n]+)`, "i");
    const m = text.match(re);
    if (m?.[1]) {
      return m[1]
        .replace(/\s+/g, " ")
        .replace(
          /\s+(?:CNR(?: Number)?|Case Type|Filing Number|Filing Date|Registration Number|Registration Date|First Hearing Date|Next Hearing Date|Case Status|Case Stage|Court Number and Judge|Petitioner|Respondent|History of case)\b.*$/i,
          "",
        )
        .trim();
    }
  }
  return "";
}

function partiesFromBlock(text: string): Party[] {
  const parties: Party[] = [];
  const pet = field(text, ["Petitioner(?: and Advocate)?", "Plaintiff", "Appellant", "Applicant"]);
  const res = field(text, ["Respondent(?: and Advocate)?", "Defendant", "Accused"]);
  if (pet) {
    const [name] = pet.split("/").map((s) => s.trim());
    if (name) parties.push({ role: "petitioner", name: name.replace(/\s+and advocate.*$/i, "").trim() });
  }
  if (res) {
    const [name] = res.split("/").map((s) => s.trim());
    if (name) parties.push({ role: "respondent", name: name.replace(/\s+and advocate.*$/i, "").trim() });
  }
  const vs = text.match(/([A-Z][A-Za-z0-9 .,&'-]{2,80})\s+v(?:s\.?|ersus)\s+([A-Z][A-Za-z0-9 .,&'-]{2,80})/);
  if (parties.length === 0 && vs) {
    parties.push({ role: "petitioner", name: vs[1].trim() });
    parties.push({ role: "respondent", name: vs[2].trim() });
  }
  return parties;
}

function historyOrders(text: string, sourceUrl: string): NormalizedOrder[] {
  const orders: NormalizedOrder[] = [];
  const table = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of table) {
    const row = line.match(
      /^(\d{1,2}[./-]\d{1,2}[./-]\d{4})\s*[|,\t]\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4})?\s*[|,\t]?\s*(.+)$/,
    );
    if (!row) continue;
    const businessOn = parseIndianDate(row[1]);
    const purpose = (row[3] || "Hearing").replace(/\s+/g, " ").trim();
    if (!businessOn) continue;
    const unavailable = /unavailable|broken|not uploaded|no pdf/i.test(purpose);
    orders.push({
      externalId: `hist-${businessOn}-${purpose.slice(0, 40)}`,
      orderDate: businessOn,
      orderType: purpose,
      title: `Order dated ${businessOn} — ${purpose}`,
      sourceUrl,
      filename: `${businessOn}.txt`,
      body: unavailable ? "" : `${purpose}. Business on ${businessOn}. ${line}`,
      available: !unavailable,
      error: unavailable ? "Court source marked this record unavailable." : undefined,
    });
  }

  const datedBlocks = text.split(/\n(?=Order dated|ORDER DATED|Dated[:\s])/i);
  for (const block of datedBlocks) {
    const date = firstDateIn(block.slice(0, 80)) || parseIndianDate(field(block, ["Order dated", "Dated"]));
    if (!date || block.length < 40) continue;
    const title = `Order dated ${date}`;
    if (orders.some((o) => o.orderDate === date && o.body.length >= block.length)) continue;
    orders.push({
      externalId: `order-${date}`,
      orderDate: date,
      orderType: "order",
      title,
      sourceUrl,
      filename: `${date}.txt`,
      body: block.trim().slice(0, 20000),
      available: true,
    });
  }
  return orders;
}

export function parseCaseStatusText(
  raw: string,
  opts: { courtId: string; courtName: string; officialUrl: string },
): { case: NormalizedCase; orders: NormalizedOrder[] } | null {
  const text = raw.replace(/\r/g, "").trim();
  if (text.length < 40) return null;
  const cnr = normalizeCnr(field(text, ["CNR Number", "CNR"])) || field(text, ["CNR Number", "CNR"]);
  const caseType = field(text, ["Case Type", "Type"]);
  const registration = field(text, ["Registration Number", "Case Number", "Reg No"]);
  const filingNumber = field(text, ["Filing Number"]);
  const filingDate = parseIndianDate(field(text, ["Filing Date"])) || firstDateIn(field(text, ["Filing Date"]));
  const registrationDate = parseIndianDate(field(text, ["Registration Date"]));
  const nextHearing = parseIndianDate(field(text, ["Next Hearing Date", "Next Date of Hearing", "Next Date"]));
  const status = field(text, ["Case Status", "Status"]) || "Pending";
  const stageRaw = field(text, ["Case Stage", "Stage"]);
  const courtEstablishment = field(text, ["Court Name", "Court Number and Judge", "Court"]) || opts.courtName;
  const judge = field(text, ["Court Number and Judge", "Judge", "Bench"]);
  const parties = partiesFromBlock(text);
  const proceeding = proceedingFromCaseType(caseType || text.slice(0, 80));
  const caseNumber =
    caseType && registration && !registration.toUpperCase().startsWith(caseType.toUpperCase())
      ? `${caseType} ${registration}`
      : registration || field(text, ["Case No", "Case Number"]);
  if (!cnr && !caseNumber && parties.length === 0) return null;
  const retrievedAt = new Date().toISOString();
  const cse: NormalizedCase = {
    courtId: opts.courtId,
    courtName: opts.courtName,
    courtEstablishment,
    caseType,
    caseNumber,
    registrationNumber: registration,
    filingNumber,
    filingDate,
    registrationDate,
    cnr,
    parties,
    advocates: field(text, ["Petitioner and Advocate", "Respondent and Advocate"]),
    status,
    stage: stageFromCourtStage(stageRaw || status, proceeding),
    proceeding,
    jurisdiction: opts.courtName,
    nextHearingOn: nextHearing,
    lastOrderOn: null,
    disposalDate: parseIndianDate(field(text, ["Disposal Date"])),
    judge,
    subject: field(text, ["Acts", "Under Act", "Subject"]),
    sourceUrl: opts.officialUrl,
    retrievedAt,
    unavailable: [],
    notes: [
      captionFromParties(parties, caseNumber || cnr || "Imported case"),
      caseType && `Type: ${caseType}`,
      cnr && `CNR: ${cnr}`,
      status && `Status: ${status}`,
      stageRaw && `Stage: ${stageRaw}`,
      nextHearing && `Next hearing: ${nextHearing}`,
      `Source: ${opts.officialUrl}`,
      `Retrieved: ${retrievedAt}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
  const orders = historyOrders(text, opts.officialUrl);
  const last = orders.map((o) => o.orderDate).filter(Boolean).sort().at(-1) ?? null;
  cse.lastOrderOn = last;
  return { case: cse, orders };
}
