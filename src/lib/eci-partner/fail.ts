import type { EciHttpErr, FetchCnrResult, InboxLandPlan } from "./types.ts";

export const API_KEY_NOT_CONFIGURED = "API key not configured";
export const EMPTY_PARSE_MESSAGE = "eCourtsIndia returned the case but no order text. Nothing was invented.";
export const IK_EMPTY_PARSE_MESSAGE =
  "Indian Kanoon returned hits but no order text. Nothing was invented. Live cause-list cases often need eCourtsIndia.";
export const IK_NOT_FOUND_MESSAGE = "Indian Kanoon has no published document for this CNR.";
export const PDF_PENDING_MESSAGE =
  "eCourtsIndia listed PDF orders but has not converted the text yet. Try Fetch again in a minute.";

export function missingKeyResult(): Extract<FetchCnrResult, { ok: false }> {
  return {
    ok: false,
    error: "API_KEY_MISSING",
    status: "fetch_error",
    message: API_KEY_NOT_CONFIGURED,
  };
}

/** 4xx / 5xx / network — never invent an order body. */
export function fetchErrorResult(fetched: EciHttpErr, cnr?: string): Extract<FetchCnrResult, { ok: false }> {
  return {
    ok: false,
    error: fetched.error,
    status: "fetch_error",
    code: fetched.code,
    message: fetched.error === "API_KEY_MISSING" ? API_KEY_NOT_CONFIGURED : fetched.message,
    cnr,
  };
}

/** 200 with no landable markdown/description — needs a human, no invented body. */
export function emptyParseResult(cnr: string, pdfPending = false): Extract<FetchCnrResult, { ok: false }> {
  return {
    ok: false,
    error: "EMPTY_PARSE",
    status: "needs_human",
    message: pdfPending ? PDF_PENDING_MESSAGE : EMPTY_PARSE_MESSAGE,
    cnr,
  };
}

export function ikEmptyParseResult(cnr: string): Extract<FetchCnrResult, { ok: false }> {
  return {
    ok: false,
    error: "EMPTY_PARSE",
    status: "needs_human",
    message: IK_EMPTY_PARSE_MESSAGE,
    cnr,
  };
}

export function emptyParseStatus(plan: InboxLandPlan): "needs_human" | null {
  return plan.empty ? "needs_human" : null;
}
