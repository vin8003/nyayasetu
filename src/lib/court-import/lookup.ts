import { courtSourceById } from "./courts.ts";

export function guessCourtId(courtName: string, courtSourceId: string): string {
  if (courtSourceById(courtSourceId)) return courtSourceId;
  if (/high court|delhi high/i.test(courtName)) return "delhi-hc";
  return "district-ecourts";
}

export function lookupFromMatter(input: {
  cnr: string;
  caseNumber: string;
  courtName: string;
  courtSourceId: string;
}) {
  const courtId = guessCourtId(input.courtName, input.courtSourceId);
  const lookup: Record<string, string> = {};
  if (input.cnr.trim()) lookup.cnr = input.cnr.trim();
  const m = input.caseNumber.trim().match(/^(.+?)\s+(\d+)\s*\/\s*(\d{4})$/);
  if (m) {
    lookup.caseType = m[1].trim();
    lookup.caseNumber = m[2];
    lookup.year = m[3];
  } else if (input.caseNumber.trim() && !lookup.cnr) {
    lookup.caseNumber = input.caseNumber.trim();
  }
  return { courtId, lookup };
}
