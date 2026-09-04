import { normalizeCaseNumber, normalizeCnr } from "./hash.ts";
import type { NormalizedCase, NormalizedOrder } from "./types.ts";

export const DEMO_DISTRICT_CNR = "DLND010012342025";
export const DEMO_DISTRICT_CASE = "CS 184/2025";
export const DEMO_HC_CASE = "W.P.(C) 3312/2025";

const DEMO_DISTRICT_SOURCE = "citebench://demo/district-ecourts";
const DEMO_HC_SOURCE = "citebench://demo/delhi-hc";

function order(
  date: string,
  title: string,
  body: string,
  extra?: Partial<NormalizedOrder>,
): NormalizedOrder {
  return {
    externalId: `demo-${date}-${title.slice(0, 24)}`,
    orderDate: date,
    orderType: title,
    title: `Order dated ${date} — ${title}`,
    sourceUrl: extra?.sourceUrl ?? DEMO_DISTRICT_SOURCE,
    filename: `${date}.txt`,
    body,
    available: extra?.available ?? true,
    error: extra?.error,
  };
}

const kapoorOrders: NormalizedOrder[] = [
  order(
    "2025-01-10",
    "Institution",
    `IN THE COURT OF MS. A. SHARMA, DJ (COMMERCIAL), TIS HAZARI, DELHI
CS 184/2025
Kapoor v Metro Builders Pvt Ltd
Dated 10 January 2025

The plaint is presented. The suit is instituted for recovery of Rs. 18,40,000 with interest. Register the suit. Issue summons to the defendant. Put up on 28.01.2025 for appearance.
Next Date of Hearing: 28-01-2025`,
  ),
  order(
    "2025-01-28",
    "Notice",
    `Order dated 28.01.2025
Counsel for the plaintiff present. Defendant not served. Issue notice to the defendant through ordinary process and speed post. Process fee be filed within 7 days. Next Date of Hearing: 18-02-2025.`,
  ),
  order(
    "2025-02-18",
    "Appearance / WS",
    `Order dated 18.02.2025
Defendant appeared through counsel. Written statement is directed to be filed within 30 days. Replication thereafter. Next Date of Hearing: 25-03-2025.`,
  ),
  order(
    "2025-03-25",
    "WS filed",
    `Order dated 25.03.2025
Written statement filed. Replication is directed to be filed within 2 weeks. Next Date of Hearing: 12-04-2025.`,
  ),
  order(
    "2025-04-12",
    "Replication",
    `Order dated 12.04.2025
Replication filed. List the matter for framing of issues. Next Date of Hearing: 02-05-2025.`,
  ),
  order(
    "2025-05-02",
    "Issues",
    "",
    {
      available: false,
      error: "Court source returned a broken link for this order.",
      sourceUrl: `${DEMO_DISTRICT_SOURCE}#issues-unavailable`,
    },
  ),
  order(
    "2025-08-12",
    "Arguments",
    `Order dated 12.08.2025
Issues already on record. Plaintiff's evidence closed on the last date. Matter is listed for arguments. Parties to file written submissions. Next Date of Hearing: 18-09-2026.`,
  ),
];

const vermaOrders: NormalizedOrder[] = [
  order(
    "2025-03-04",
    "Admission",
    `IN THE HIGH COURT OF DELHI AT NEW DELHI
W.P.(C) 3312/2025
Verma v GNCTD
Dated 4 March 2025

The writ petition is filed challenging the termination of a guest faculty appointment. Issue notice. Counter affidavit be filed within 4 weeks. Next Date of Hearing: 08-04-2025.`,
    { sourceUrl: DEMO_HC_SOURCE },
  ),
  order(
    "2025-04-08",
    "Counter",
    `Order dated 08.04.2025
Respondent appeared. Counter affidavit filed. Rejoinder, if any, within 2 weeks. Next Date of Hearing: 20-05-2025.`,
    { sourceUrl: DEMO_HC_SOURCE },
  ),
  order(
    "2025-05-20",
    "Rejoinder",
    `Order dated 20.05.2025
Rejoinder filed. Listed for arguments. Next Date of Hearing: 22-09-2026.`,
    { sourceUrl: DEMO_HC_SOURCE },
  ),
];

export type DemoFixture = {
  id: string;
  courtId: string;
  case: NormalizedCase;
  orders: NormalizedOrder[];
};

function retrieved(): string {
  return new Date().toISOString();
}

export const DISTRICT_FIXTURE: DemoFixture = {
  id: "demo-district-kapoor",
  courtId: "district-ecourts",
  case: {
    courtId: "district-ecourts",
    courtName: "Tis Hazari District Court, Delhi",
    courtEstablishment: "District Judge (Commercial), Tis Hazari",
    caseType: "CS",
    caseNumber: "CS 184/2025",
    registrationNumber: "184/2025",
    filingNumber: "CS/184/2025",
    filingDate: "2025-01-10",
    registrationDate: "2025-01-12",
    cnr: DEMO_DISTRICT_CNR,
    parties: [
      { role: "plaintiff", name: "Rohit Kapoor" },
      { role: "defendant", name: "Metro Builders Pvt Ltd" },
    ],
    advocates: "Plaintiff: Adv. Mehta / Defendant: Adv. Rao",
    status: "Pending",
    stage: "arguments",
    proceeding: "commercial",
    jurisdiction: "Delhi District Courts",
    nextHearingOn: "2026-09-18",
    lastOrderOn: "2025-08-12",
    disposalDate: null,
    judge: "Ms. A. Sharma, DJ (Commercial)",
    subject: "Recovery of money — construction dues",
    sourceUrl: DEMO_DISTRICT_SOURCE,
    retrievedAt: "",
    unavailable: ["Order dated 2025-05-02 — Issues"],
    notes: "",
  },
  orders: kapoorOrders,
};

export const DELHI_HC_FIXTURE: DemoFixture = {
  id: "demo-dhc-verma",
  courtId: "delhi-hc",
  case: {
    courtId: "delhi-hc",
    courtName: "Delhi High Court",
    courtEstablishment: "High Court of Delhi at New Delhi",
    caseType: "W.P.(C)",
    caseNumber: "W.P.(C) 3312/2025",
    registrationNumber: "3312/2025",
    filingNumber: "W.P.(C)/3312/2025",
    filingDate: "2025-03-04",
    registrationDate: "2025-03-04",
    cnr: "",
    parties: [
      { role: "petitioner", name: "Anita Verma" },
      { role: "respondent", name: "GNCTD" },
    ],
    advocates: "Petitioner: Adv. Khanna / Respondent: Standing Counsel",
    status: "Pending",
    stage: "final_hearing",
    proceeding: "writ",
    jurisdiction: "Delhi High Court",
    nextHearingOn: "2026-09-22",
    lastOrderOn: "2025-05-20",
    disposalDate: null,
    judge: "Hon'ble Mr. Justice (roster)",
    subject: "Service — guest faculty termination",
    sourceUrl: DEMO_HC_SOURCE,
    retrievedAt: "",
    unavailable: [],
    notes: "",
  },
  orders: vermaOrders,
};

export function matchDistrictDemo(lookup: Record<string, string>): DemoFixture | null {
  const cnr = normalizeCnr(lookup.cnr ?? "");
  if (cnr && cnr === DEMO_DISTRICT_CNR) return stamp(DISTRICT_FIXTURE);
  const formatted = `${(lookup.caseType ?? "").trim()} ${(lookup.caseNumber ?? "").trim()}/${(lookup.year ?? "").trim()}`
    .replace(/\s+/g, " ")
    .trim();
  if (normalizeCaseNumber(formatted) === normalizeCaseNumber(DEMO_DISTRICT_CASE)) return stamp(DISTRICT_FIXTURE);
  if (normalizeCaseNumber(lookup.caseNumber ?? "") === normalizeCaseNumber(DEMO_DISTRICT_CASE)) {
    return stamp(DISTRICT_FIXTURE);
  }
  return null;
}

export function matchDelhiHcDemo(lookup: Record<string, string>): DemoFixture | null {
  const formatted = `${(lookup.caseType ?? "").trim()} ${(lookup.caseNumber ?? "").trim()}/${(lookup.year ?? "").trim()}`
    .replace(/\s+/g, " ")
    .trim();
  if (normalizeCaseNumber(formatted) === normalizeCaseNumber(DEMO_HC_CASE)) return stamp(DELHI_HC_FIXTURE);
  if (normalizeCaseNumber(lookup.caseNumber ?? "") === normalizeCaseNumber(DEMO_HC_CASE)) return stamp(DELHI_HC_FIXTURE);
  return null;
}

function stamp(fixture: DemoFixture): DemoFixture {
  const retrievedAt = retrieved();
  const notes = [
    `${fixture.case.parties[0]?.name ?? ""} v ${fixture.case.parties[1]?.name ?? ""}`.trim(),
    `Court: ${fixture.case.courtName}`,
    `Case: ${fixture.case.caseNumber}`,
    fixture.case.cnr ? `CNR: ${fixture.case.cnr}` : "",
    `Status: ${fixture.case.status}`,
    fixture.case.nextHearingOn ? `Next hearing: ${fixture.case.nextHearingOn}` : "",
    `Judge: ${fixture.case.judge}`,
    `Source: ${fixture.case.sourceUrl}`,
    `Retrieved: ${retrievedAt}`,
    "This reconstruction used CiteBench's published demo record for this identifier — not a live scrape of the court site.",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    ...fixture,
    case: { ...fixture.case, retrievedAt, notes },
    orders: fixture.orders.map((o) => ({ ...o })),
  };
}
