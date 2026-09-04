import type { NormalizedOrder } from "../court-import/types.ts";

/** First courts for copy and the Inbox hint — not a hard fetch reject. */
export const FIRST_STATE_PREFIXES = ["RJ", "UP", "MP", "DL"] as const;

export const ECI_BASE = "https://webapi.ecourtsindia.com";
export const ECI_SOURCE_KIND = "eci_partner";
export const MIN_ORDER_BODY = 20;

export type EciErrorCode =
  | "API_KEY_MISSING"
  | "BLANK_CNR"
  | "INVALID_CNR"
  | "SAMPLE_SKIPPED"
  | "EMPTY_PARSE"
  | "PROVIDER_DISABLED"
  | "HTTP"
  | "NETWORK";

export type EciHttpOk = {
  ok: true;
  status: number;
  json: unknown;
  requestId: string;
  refreshed: boolean;
};

export type EciHttpErr = {
  ok: false;
  error: EciErrorCode;
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
};

export type EciHttpResult = EciHttpOk | EciHttpErr;

export type PartnerCasePreview = {
  cnr: string;
  title: string;
  courtName: string;
  caseNumber: string;
  status: string;
  nextHearingOn: string | null;
};

export type PartnerParseResult = {
  preview: PartnerCasePreview;
  orders: NormalizedOrder[];
  requestId: string;
};

export type InboxLandAction = "land" | "duplicate" | "failed";

export type InboxLandItem = {
  action: InboxLandAction;
  order: NormalizedOrder;
  /** Partner fetch never auto-confirms. */
  confirmed: false;
};

export type InboxLandPlan = {
  empty: boolean;
  toLand: NormalizedOrder[];
  duplicates: NormalizedOrder[];
  failed: NormalizedOrder[];
  items: InboxLandItem[];
};

export type PartnerPendingOrder = {
  id: string;
  documentId: string;
  title: string;
  orderDate: string | null;
  body: string;
  directions: Array<{ text: string; party: string; deadline: string | null; quote: string }>;
};

export type FetchCnrResult =
  | {
      ok: true;
      matterId: string;
      cnr: string;
      preview: PartnerCasePreview;
      landed: number;
      duplicates: number;
      failed: number;
      needsHuman: number;
      refreshed: boolean;
      pending: PartnerPendingOrder[];
    }
  | {
      ok: false;
      error: EciErrorCode;
      status?: "fetch_error" | "needs_human";
      code?: string;
      message: string;
      cnr?: string;
    };
