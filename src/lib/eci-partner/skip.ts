import { DEMO_DISTRICT_CNR } from "../court-import/fixtures.ts";
import { isSampleMatter, looksLikeSample } from "../practice/sample-ids.ts";
import { normalizeCnr } from "./cnr.ts";

/** Published demo CNR — reconstruct locally, do not send to Partner API. */
export const SAMPLE_CNRS = [DEMO_DISTRICT_CNR] as const;

export function isSampleCnr(value: string | null | undefined): boolean {
  const cnr = normalizeCnr(value ?? "");
  return Boolean(cnr) && (SAMPLE_CNRS as readonly string[]).includes(cnr);
}

export function shouldSkipSample(input: {
  title?: string | null;
  caseNumber?: string | null;
  facts?: string | null;
  cnr?: string | null;
} = {}): boolean {
  if (isSampleCnr(input.cnr)) return true;
  if (isSampleMatter({ title: input.title, caseNumber: input.caseNumber })) return true;
  if (looksLikeSample({ title: input.title, facts: input.facts })) return true;
  return false;
}
