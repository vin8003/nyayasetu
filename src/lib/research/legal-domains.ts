export const LEGAL_DOMAINS = [
  "indiankanoon.org",
  "livelaw.in",
  "casemine.com",
  "judgments.ecourts.gov.in",
  "sci.gov.in",
] as const;

export type LegalDomain = (typeof LEGAL_DOMAINS)[number];
