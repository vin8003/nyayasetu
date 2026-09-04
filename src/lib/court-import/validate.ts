import { normalizeCnr } from "./hash.ts";

export function isValidCnr(value: string): boolean {
  const cnr = normalizeCnr(value);
  return cnr.length === 16 && /^[A-Z]{4}[A-Z0-9]{2}\d{10}$/.test(cnr);
}

export function isValidYear(value: string): boolean {
  const y = Number(value.trim());
  return Number.isInteger(y) && y >= 1950 && y <= 2100;
}

export function isValidCaseNumberPart(value: string): boolean {
  return /^\d{1,8}$/.test(value.trim());
}

export function districtLookupError(lookup: Record<string, string>): string | null {
  const cnr = (lookup.cnr ?? "").trim();
  if (cnr) {
    return isValidCnr(cnr) ? null : "CNR must be 16 letters and digits (hyphens are fine).";
  }
  const type = (lookup.caseType ?? "").trim();
  const num = (lookup.caseNumber ?? "").trim();
  const year = (lookup.year ?? "").trim();
  if (!type || !num || !year) {
    return "Enter a CNR, or case type, number and year.";
  }
  if (!isValidYear(year)) return "Year looks wrong.";
  if (!isValidCaseNumberPart(num) && !/\d/.test(num)) return "Case number needs a digit.";
  return null;
}

export function highCourtLookupError(lookup: Record<string, string>): string | null {
  const type = (lookup.caseType ?? "").trim();
  const num = (lookup.caseNumber ?? "").trim();
  const year = (lookup.year ?? "").trim();
  if (!type || !num || !year) return "Delhi High Court needs case type, number and year.";
  if (!isValidYear(year)) return "Year looks wrong.";
  return null;
}

export function formatCaseNumber(lookup: Record<string, string>): string {
  const type = (lookup.caseType ?? "").trim();
  const num = (lookup.caseNumber ?? "").trim();
  const year = (lookup.year ?? "").trim();
  if (type && num && year) return `${type} ${num}/${year}`.replace(/\s+/g, " ");
  return (lookup.caseNumber ?? "").trim();
}
