import type { ProceedingId } from "@/lib/practice/types";

export function proceedingFromCaseType(caseType: string): ProceedingId {
  const t = caseType.toLowerCase();
  if (/\b(bail|crl|cr\.|fir|sessions|ndps)\b/.test(t) || t.includes("criminal")) return "criminal";
  if (/\b(w\.?p|cwp|pil|writ|lpa)\b/.test(t)) return "writ";
  if (/\b(fao|rsa|crl\.?\s*a|appeal|rfa)\b/.test(t)) return "appellate";
  if (/\b(hma|gwa|mat|family|divorce)\b/.test(t)) return "family";
  if (/\b(cc|consumer|ncdrc)\b/.test(t)) return "consumer";
  if (/\b(arb|arbitration)\b/.test(t)) return "arbitration";
  if (/\b(ex|exec|ep)\b/.test(t)) return "execution";
  if (/\bcomm|commercial/.test(t)) return "commercial";
  return "civil";
}

export function stageFromCourtStage(raw: string, proceeding: string): string {
  const t = raw.toLowerCase();
  if (/dispos|dismiss|decree|judgment|allowed|rejected/.test(t)) return "closed";
  if (/argument/.test(t)) return proceeding === "writ" ? "final_hearing" : "arguments";
  if (/issue/.test(t)) return "issues";
  if (/evidence|plaintiff|pw/.test(t)) return proceeding === "criminal" ? "prosecution_evidence" : "plaintiff_evidence";
  if (/replication|rejoinder/.test(t)) return "replication";
  if (/written statement|w\.?s/.test(t)) return "ws_pending";
  if (/summon/.test(t)) return "summons";
  if (/notice/.test(t)) return "notice";
  if (/service/.test(t)) return "service";
  if (/interim|stay|injunction/.test(t)) return "interim";
  if (/admission/.test(t)) return "admission";
  if (/bail/.test(t)) return "bail";
  if (/charge/.test(t)) return "charge";
  return proceeding === "writ" ? "admission" : "notice";
}

export function captionFromParties(
  parties: Array<{ role: string; name: string }>,
  fallback: string,
): string {
  const pet = parties.find((p) => /petit|plaint|appellant|applicant|complain/i.test(p.role));
  const res = parties.find((p) => /respond|defend|accused|state/i.test(p.role));
  if (pet && res) return `${pet.name} v ${res.name}`;
  if (pet) return pet.name;
  return fallback;
}
