import { normalizeCnr } from "../court-import/hash.ts";
import { isValidCnr } from "../court-import/validate.ts";
import { FIRST_STATE_PREFIXES } from "./types.ts";

export { normalizeCnr, isValidCnr };

export function isBlankCnr(value: string | null | undefined): boolean {
  return !normalizeCnr(value ?? "");
}

export function partnerCnrError(value: string | null | undefined): "BLANK_CNR" | "INVALID_CNR" | null {
  const cnr = normalizeCnr(value ?? "");
  if (!cnr) return "BLANK_CNR";
  if (!isValidCnr(cnr)) return "INVALID_CNR";
  return null;
}

export function isFirstStateCnr(value: string): boolean {
  const cnr = normalizeCnr(value);
  return FIRST_STATE_PREFIXES.some((prefix) => cnr.startsWith(prefix));
}
