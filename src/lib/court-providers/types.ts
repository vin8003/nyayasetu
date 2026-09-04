import type { FetchCnrResult } from "../eci-partner/types.ts";

/** Register new court-data APIs here as they ship. Admin switches globally. */
export const COURT_PROVIDER_IDS = ["eci_partner", "indiankanoon", "none"] as const;
export type CourtProviderId = (typeof COURT_PROVIDER_IDS)[number];

export const DEFAULT_COURT_PROVIDER_ID: CourtProviderId = "eci_partner";
export const SETTINGS_KEY_PROVIDER = "court_data_provider";

export type CourtProviderPublic = {
  id: CourtProviderId;
  name: string;
  nameHi: string;
  summary: string;
  /** Implemented enough to turn on from Admin. */
  selectable: boolean;
};

export type CourtProviderStatus = CourtProviderPublic & {
  configured: boolean;
  active: boolean;
};

export type FetchCnrInput = {
  userId: string;
  matterId?: string;
  cnr?: string;
  refresh?: boolean;
};

export type CourtDataAdapter = CourtProviderPublic & {
  /** Stored on matter_documents.source_kind. */
  sourceKind: string;
  isConfigured(): boolean;
  fetchCnr(input: FetchCnrInput): Promise<FetchCnrResult>;
};

export function parseProviderId(value: string | null | undefined): CourtProviderId {
  const id = (value ?? "").trim();
  if (!id) return DEFAULT_COURT_PROVIDER_ID;
  if (id === "eci_partner") return "eci_partner";
  if (id === "indiankanoon") return "indiankanoon";
  if (id === "none") return "none";
  return "none";
}

export function isCourtProviderId(value: string): value is CourtProviderId {
  return (COURT_PROVIDER_IDS as readonly string[]).includes(value);
}
