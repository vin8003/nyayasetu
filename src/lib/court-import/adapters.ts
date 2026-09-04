import { COURT_SOURCES, courtSourceById, DELHI_HC_ID, DISTRICT_ECOURTS_ID, validateCourtLookup } from "./courts.ts";
import { matchDelhiHcDemo, matchDistrictDemo } from "./fixtures.ts";
import { parseCaseStatusText } from "./parse-case-status.ts";
import type { AdapterSearchResult, CourtAdapter } from "./types.ts";

const CAPTCHA_NOTE =
  "The official court website requires CAPTCHA. Complete it there, then paste the case status or upload the orders. CiteBench will not bypass CAPTCHA.";

function districtSearch(lookup: Record<string, string>): AdapterSearchResult {
  const demo = matchDistrictDemo(lookup);
  if (demo) return { kind: "found", case: demo.case, orders: demo.orders, demo: true };
  const src = courtSourceById(DISTRICT_ECOURTS_ID)!;
  return { kind: "captcha", officialUrl: src.officialUrl, message: CAPTCHA_NOTE };
}

function delhiSearch(lookup: Record<string, string>): AdapterSearchResult {
  const demo = matchDelhiHcDemo(lookup);
  if (demo) return { kind: "found", case: demo.case, orders: demo.orders, demo: true };
  const src = courtSourceById(DELHI_HC_ID)!;
  return { kind: "captcha", officialUrl: src.officialUrl, message: CAPTCHA_NOTE };
}

export const ADAPTERS: CourtAdapter[] = COURT_SOURCES.map((src) => ({
  ...src,
  validate(lookup) {
    return validateCourtLookup(src.id, lookup);
  },
  search(lookup) {
    if (src.id === DISTRICT_ECOURTS_ID) return districtSearch(lookup);
    if (src.id === DELHI_HC_ID) return delhiSearch(lookup);
    return { kind: "error", message: "Unknown court source." };
  },
}));

export function getAdapter(id: string): CourtAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

export function searchCourt(courtId: string, lookup: Record<string, string>): AdapterSearchResult {
  const adapter = getAdapter(courtId);
  if (!adapter) return { kind: "error", message: "Unknown court source." };
  const valid = adapter.validate(lookup);
  if (!valid.ok) return { kind: "error", message: valid.error };
  return adapter.search(lookup);
}

export function continueFromPaste(
  courtId: string,
  pastedText: string,
): AdapterSearchResult {
  const adapter = getAdapter(courtId);
  if (!adapter) return { kind: "error", message: "Unknown court source." };
  const parsed = parseCaseStatusText(pastedText, {
    courtId: adapter.id,
    courtName: adapter.name,
    officialUrl: adapter.officialUrl,
  });
  if (!parsed) {
    return {
      kind: "error",
      message: "Could not read a case status from that text. Paste the eCourts / High Court result, or upload orders.",
    };
  }
  if (parsed.orders.length === 0 && pastedText.trim().length >= 80) {
    parsed.orders.push({
      externalId: `paste-${parsed.case.caseNumber || parsed.case.cnr || "status"}`,
      orderDate: parsed.case.lastOrderOn || parsed.case.filingDate,
      orderType: "case-status",
      title: "Pasted case status",
      sourceUrl: adapter.officialUrl,
      filename: "case-status.txt",
      body: pastedText.trim().slice(0, 20000),
      available: true,
    });
  }
  return { kind: "found", case: parsed.case, orders: parsed.orders, demo: false };
}
