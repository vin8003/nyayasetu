import { COURT_SOURCES, DELHI_HC_ID, DISTRICT_ECOURTS_ID, validateCourtLookup } from "./courts.ts";
import { matchDelhiHcDemo, matchDistrictDemo } from "./fixtures.ts";
import type { AdapterSearchResult, CourtAdapter } from "./types.ts";

const PARTNER_NOTE =
  "Live CNR fetch uses the eCourtsIndia Partner API. CiteBench does not open the court CAPTCHA page or accept a paste-status handoff from eCourts.gov.in.";

function districtSearch(lookup: Record<string, string>): AdapterSearchResult {
  const demo = matchDistrictDemo(lookup);
  if (demo) return { kind: "found", case: demo.case, orders: demo.orders, demo: true };
  return { kind: "error", message: PARTNER_NOTE };
}

function delhiSearch(lookup: Record<string, string>): AdapterSearchResult {
  const demo = matchDelhiHcDemo(lookup);
  if (demo) return { kind: "found", case: demo.case, orders: demo.orders, demo: true };
  return { kind: "error", message: PARTNER_NOTE };
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
