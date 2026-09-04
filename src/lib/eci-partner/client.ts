/**
 * eCourtsIndia Partner API client.
 *
 * Detail: GET https://webapi.ecourtsindia.com/api/partner/case/{cnr}
 * Auth:   Authorization: Bearer <ECI_API_KEY>  (server-only; never VITE_)
 *
 * CiteBench uses this under the Partner API terms to assist a lawyer with
 * their own matters. Do not use this module for stand-alone competing
 * court-data resale without a written MSA / consent from eCourtsIndia.
 *
 * Do not scrape eCourts.gov.in. Do not solve CAPTCHAs.
 * Unit tests must pass fetchImpl — live Partner calls are forbidden under node:test.
 */
import { isForbiddenCourtUrl } from "../court-import/forbidden.ts";
import { isValidCnr, normalizeCnr } from "./cnr.ts";
import { ECI_BASE, type EciHttpResult } from "./types.ts";

const TIMEOUT_MS = 20000;

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

function caseDetailUrl(cnr: string): string {
  return `${ECI_BASE}/api/partner/case/${cnr}`;
}

function caseRefreshUrl(cnr: string): string {
  return `${ECI_BASE}/api/partner/case/${cnr}/refresh`;
}

export function orderMarkdownUrl(cnr: string, file: string): string {
  const safe = file.replace(/[^A-Za-z0-9._-]/g, "");
  return `${ECI_BASE}/api/partner/case/${cnr}/order-md/${safe}`;
}

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (process.env.NODE_TEST_CONTEXT) {
    throw new Error("Live Partner API is forbidden in tests. Pass fetchImpl with a mock.");
  }
  return fetch(input, init);
}

function errorMessage(code: string, fallback: string): string {
  if (code === "INVALID_CNR") return "CNR must be 16 letters and digits.";
  if (code === "CASE_NOT_FOUND") return "No case for that CNR.";
  if (code === "RATE_LIMIT_EXCEEDED" || code === "TOO_MANY_CONVERSIONS") return "Court-data API rate limit — try again in a minute.";
  if (code === "INSUFFICIENT_CREDITS") return "Court-data API credits are exhausted.";
  if (code === "INVALID_TOKEN" || code === "TOKEN_INACTIVE" || code === "TOKEN_EXPIRED") {
    return "Could not fetch from the court-data API.";
  }
  return fallback;
}

function readError(json: unknown, status: number): { code: string; message: string; requestId: string } {
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const err = root.error && typeof root.error === "object" ? (root.error as Record<string, unknown>) : {};
  const meta = root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : {};
  const code = typeof err.code === "string" ? err.code : status === 404 ? "CASE_NOT_FOUND" : status === 429 ? "RATE_LIMIT_EXCEEDED" : `HTTP_${status}`;
  const rawMessage = typeof err.message === "string" && err.message.trim() ? err.message : "";
  const safeMessage = rawMessage && !/[<>]/.test(rawMessage) ? rawMessage : "Could not fetch from the court-data API.";
  const message = errorMessage(code, safeMessage);
  const requestId = typeof meta.request_id === "string" ? meta.request_id : "";
  return { code, message, requestId };
}

async function partnerFetch(
  fetchImpl: FetchImpl,
  apiKey: string,
  url: string,
  method: "GET" | "POST",
  timeoutMs = TIMEOUT_MS,
): Promise<{ response: Response; json: unknown } | { network: true; message: string }> {
  if (isForbiddenCourtUrl(url)) {
    return { network: true, message: "CiteBench does not fetch from the official eCourts site." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    let json: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 200) };
      }
    }
    return { response, json };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network";
    return { network: true, message };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPartnerCase(input: {
  cnr: string;
  apiKey: string | null;
  refresh?: boolean;
  fetchImpl?: FetchImpl;
}): Promise<EciHttpResult> {
  const cnr = normalizeCnr(input.cnr);
  if (!cnr) {
    return { ok: false, error: "BLANK_CNR", message: "Enter a CNR." };
  }
  if (!isValidCnr(cnr)) {
    return { ok: false, error: "INVALID_CNR", message: "CNR must be 16 letters and digits." };
  }
  if (!input.apiKey) {
    return { ok: false, error: "API_KEY_MISSING", message: "API key not configured" };
  }

  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const detailUrl = caseDetailUrl(cnr);
  if (isForbiddenCourtUrl(detailUrl)) {
    return { ok: false, error: "HTTP", message: "CiteBench does not fetch from the official eCourts site." };
  }
  let refreshed = false;
  if (input.refresh) {
    const refreshUrl = caseRefreshUrl(cnr);
    if (isForbiddenCourtUrl(refreshUrl)) {
      return { ok: false, error: "HTTP", message: "CiteBench does not fetch from the official eCourts site." };
    }
    const queued = await partnerFetch(fetchImpl, input.apiKey, refreshUrl, "POST");
    if ("network" in queued) {
      return { ok: false, error: "NETWORK", message: "Could not reach the court-data API." };
    }
    refreshed = queued.response.status === 202 || queued.response.ok;
  }

  const got = await partnerFetch(fetchImpl, input.apiKey, detailUrl, "GET");
  if ("network" in got) {
    return { ok: false, error: "NETWORK", message: got.message.includes("forbidden in tests") ? got.message : "Could not reach the court-data API." };
  }
  const requestId =
    got.json && typeof got.json === "object" && got.json !== null
      ? String(((got.json as Record<string, unknown>).meta as { request_id?: string } | undefined)?.request_id ?? "")
      : "";
  if (!got.response.ok) {
    const parsed = readError(got.json, got.response.status);
    return {
      ok: false,
      error: "HTTP",
      status: got.response.status,
      code: parsed.code,
      message: parsed.message,
      requestId: parsed.requestId || requestId,
    };
  }
  return { ok: true, status: got.response.status, json: got.json, requestId, refreshed };
}

const ORDER_MD_TIMEOUT_MS = 60000;

export async function fetchPartnerOrderMarkdown(input: {
  cnr: string;
  file: string;
  apiKey: string | null;
  fetchImpl?: FetchImpl;
}): Promise<{ ok: true; body: string } | { ok: false; message: string }> {
  const cnr = normalizeCnr(input.cnr);
  const file = (input.file || "").replace(/[^A-Za-z0-9._-]/g, "");
  if (!cnr || !isValidCnr(cnr) || !file || !/\.pdf$/i.test(file)) {
    return { ok: false, message: "No order file." };
  }
  if (!input.apiKey) {
    return { ok: false, message: "API key not configured" };
  }
  const url = orderMarkdownUrl(cnr, file);
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const got = await partnerFetch(fetchImpl, input.apiKey, url, "GET", ORDER_MD_TIMEOUT_MS);
  if ("network" in got) return { ok: false, message: got.message };
  if (!got.response.ok) return { ok: false, message: "Could not fetch order text." };
  const root = got.json && typeof got.json === "object" ? (got.json as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const body = typeof data.markdownContent === "string" ? data.markdownContent.trim() : "";
  if (body.length < 20) return { ok: false, message: "empty markdown" };
  return { ok: true, body: body.slice(0, 40000) };
}
