import type { Party, ProceedingId } from "@/lib/practice/types";

export const IMPORT_STATUSES = [
  "CREATED",
  "CONNECTING",
  "SEARCHING",
  "CAPTCHA_REQUIRED",
  "RETRIEVING_CASE",
  "RETRIEVING_HISTORY",
  "DOWNLOADING_ORDERS",
  "DEDUPLICATING",
  "ANALYSING",
  "BUILDING_TIMELINE",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const VERIFICATIONS = ["unreviewed", "court_imported", "ai_inferred", "lawyer_verified"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export type LookupField = {
  id: string;
  label: string;
  labelHi: string;
  required: boolean;
  placeholder?: string;
  hint?: string;
  hintHi?: string;
};

export type CourtSource = {
  id: string;
  name: string;
  nameHi: string;
  kind: "district" | "high_court";
  officialUrl: string;
  officialName: string;
  fields: LookupField[];
  demoHint: string;
  demoHintHi: string;
};

export type NormalizedCase = {
  courtId: string;
  courtName: string;
  courtEstablishment: string;
  caseType: string;
  caseNumber: string;
  registrationNumber: string;
  filingNumber: string;
  filingDate: string | null;
  registrationDate: string | null;
  cnr: string;
  parties: Party[];
  advocates: string;
  status: string;
  stage: string;
  proceeding: ProceedingId | string;
  jurisdiction: string;
  nextHearingOn: string | null;
  lastOrderOn: string | null;
  disposalDate: string | null;
  judge: string;
  subject: string;
  sourceUrl: string;
  retrievedAt: string;
  unavailable: string[];
  notes: string;
};

export type NormalizedOrder = {
  externalId: string;
  orderDate: string | null;
  orderType: string;
  title: string;
  sourceUrl: string;
  filename: string;
  body: string;
  available: boolean;
  error?: string;
};

export type AdapterSearchResult =
  | { kind: "found"; case: NormalizedCase; orders: NormalizedOrder[]; demo: boolean }
  | { kind: "captcha"; officialUrl: string; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "error"; message: string };

export type CourtAdapter = CourtSource & {
  validate(lookup: Record<string, string>): { ok: true } | { ok: false; error: string };
  search(lookup: Record<string, string>): AdapterSearchResult;
};

export type ExtractedEvent = {
  happenedOn: string;
  kind: string;
  title: string;
  detail: string;
  origin: "court_direction" | "ai_inference";
  verification: Verification;
  quote: string;
  sourceTitle: string;
  deadline: string | null;
  action: string | null;
};

export type ImportSummary = {
  caseDetails: "imported" | "partial" | "failed" | "pending";
  found: number;
  imported: number;
  duplicates: number;
  failed: number;
  analysed: number;
  timelineEvents: number;
  deadlines: number;
  lastSyncedAt: string | null;
};

export type ImportRecordView = {
  id: string;
  kind: string;
  title: string;
  orderDate: string | null;
  status: string;
  sourceUrl: string;
  documentId: string | null;
  error: string;
};

export type CasePreview = {
  title: string;
  courtName: string;
  caseNumber: string;
  cnr: string;
  parties: string;
  status: string;
  stage: string;
  nextHearingOn: string | null;
  sourceUrl: string;
};

export type ImportStep = { id: ImportStatus; label: string; done: boolean; active: boolean };

export type ImportJobView = {
  id: string;
  matterId: string | null;
  courtId: string;
  courtName: string;
  status: ImportStatus;
  stageNote: string;
  officialUrl: string;
  captchaRequired: boolean;
  demo: boolean;
  error: string;
  lookup: Record<string, string>;
  casePreview: CasePreview | null;
  summary: ImportSummary;
  steps: ImportStep[];
  records: ImportRecordView[];
  updatedAt: string;
};

export function emptySummary(): ImportSummary {
  return {
    caseDetails: "pending",
    found: 0,
    imported: 0,
    duplicates: 0,
    failed: 0,
    analysed: 0,
    timelineEvents: 0,
    deadlines: 0,
    lastSyncedAt: null,
  };
}
