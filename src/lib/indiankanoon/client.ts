/**
 * Indian Kanoon API client.
 * Auth: Authorization: Token <IKANOON_API_TOKEN>
 * Live Allow on /search/ is POST, OPTIONS (user curls 2026-09-04). GET is documented
 * but unauthenticated GET 401s and authenticated GET can reset on Vercel — POST first.
 * Never scrape eCourts.gov.in. Unit tests must pass fetchImpl.
 */
import { isForbiddenCourtUrl } from "../court-import/forbidden.ts";
import { ikAuthHeaders, resolveIkApiToken } from "./key.ts";
import { parseDocument, parseSearchHits } from "./parse.ts";
import { nodeHttpsFetch } from "./transport.ts";
import { IK_MAX_DOCS, type IkDocument, type IkSearchHit } from "./types.ts";

export const IK_BASE = "https://api.indiankanoon.org";
type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;
type IkCall =
  | { ok: true; json: unknown; status: number }
  | { ok: false; status: number; message: string };

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (process.env.NODE_TEST_CONTEXT) {
    throw new Error("Live Indian Kanoon API is forbidden in tests. Pass fetchImpl with a mock.");
  }
  return nodeHttpsFetch(input, init);
}

export function searchUrl(): string {
  return `${IK_BASE}/search/`;
}

export function searchGetUrl(cnr: string): string {
  const q = new URLSearchParams({ formInput: cnr, pagenum: "0" });
  return `${IK_BASE}/search/?${q.toString()}`;
}

export function documentUrl(tid: string): string {
  const id = tid.replace(/[^0-9A-Za-z._-]/g, "");
  return `${IK_BASE}/doc/${id}/`;
}

export function searchBody(cnr: string): string {
  return new URLSearchParams({ formInput: cnr, pagenum: "0" }).toString();
}

function networkMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Could not reach Indian Kanoon.";
  if (err.message.includes("forbidden in tests")) return err.message;
  const cause =
    err.cause instanceof Error
      ? err.cause.message
      : typeof err.cause === "object" && err.cause && "code" in err.cause
        ? String((err.cause as { code?: string }).code ?? "")
        : "";
  const code =
    typeof err === "object" && err && "cause" in err && err.cause && typeof err.cause === "object" && "code" in err.cause
      ? String((err.cause as { code?: string }).code ?? "")
      : "";
  const raw = `${err.message} ${cause} ${code}`.toLowerCase();
  const tag = (code || cause).match(/\b(E[A-Z0-9]{3,}|UND_[A-Z0-9_]+)\b/);
  const suffix = tag ? ` (${tag[1]})` : "";
  if (err.name === "AbortError" || raw.includes("abort")) {
    return `Indian Kanoon timed out. Try again in a minute.${suffix}`;
  }
  if (raw.includes("enotfound") || raw.includes("dns")) {
    return `Could not resolve Indian Kanoon.${suffix}`;
  }
  if (raw.includes("cert") || raw.includes("ssl") || raw.includes("tls")) {
    return `Could not establish a TLS session with Indian Kanoon.${suffix}`;
  }
  if (raw.includes("econnreset") || raw.includes("econnrefused") || raw.includes("fetch failed")) {
    return `Could not reach Indian Kanoon (connection reset).${suffix}`;
  }
  return `Could not reach Indian Kanoon.${suffix}`;
}

function httpMessage(status: number): string {
  if (status === 401 || status === 403) return "Indian Kanoon rejected the token.";
  if (status === 429) return "Indian Kanoon rate limit — try again in a minute.";
  if (status === 405) return "Indian Kanoon rejected the request method.";
  if (status === 404) return "Indian Kanoon has no published document for this CNR.";
  return "Could not fetch from Indian Kanoon.";
}

function headersFor(token: string, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = { ...ikAuthHeaders(token) };
  if (hasBody) headers["Content-Type"] = "application/x-www-form-urlencoded";
  return headers;
}

async function callOnce(
  fetchImpl: FetchImpl,
  url: string,
  token: string,
  method: "GET" | "POST",
  body?: string,
): Promise<IkCall> {
  if (isForbiddenCourtUrl(url) || /ecourts\.gov\.in/i.test(url)) {
    return { ok: false, status: 0, message: "CiteBench does not fetch from the official eCourts site." };
  }
  const init: RequestInit = {
    method,
    headers: headersFor(token, Boolean(body)),
    body,
    redirect: "follow",
  };
  try {
    const response = await fetchImpl(url, init);
    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 4000) };
      }
    }
    if (!response.ok) {
      return { ok: false, status: response.status, message: httpMessage(response.status) };
    }
    return { ok: true, json, status: response.status };
  } catch (err) {
    return { ok: false, status: 0, message: networkMessage(err) };
  }
}

function shouldFallback(call: IkCall): boolean {
  return call.status === 405 || call.status === 0 || call.status === 501 || call.status === 411;
}

async function ikFetch(
  fetchImpl: FetchImpl,
  postUrl: string,
  getUrl: string,
  token: string,
  postBody?: string,
): Promise<IkCall> {
  const post = await callOnce(fetchImpl, postUrl, token, "POST", postBody);
  if (post.ok) return post;
  if (post.status === 0) {
    const retry = await callOnce(fetchImpl, postUrl, token, "POST", postBody);
    if (retry.ok) return retry;
    if (!shouldFallback(retry) && retry.status !== 0) return retry;
    const get = await callOnce(fetchImpl, getUrl, token, "GET");
    if (get.ok) return get;
    return retry.status !== 0 ? retry : get.status !== 0 ? get : retry;
  }
  if (!shouldFallback(post)) return post;
  const get = await callOnce(fetchImpl, getUrl, token, "GET");
  if (get.ok) return get;
  return get.status !== 0 ? get : post;
}

export async function fetchIkCase(input: {
  cnr: string;
  token: string | null;
  fetchImpl?: FetchImpl;
}): Promise<
  | { ok: true; hits: IkSearchHit[]; docs: IkDocument[] }
  | { ok: false; error: "API_KEY_MISSING" | "HTTP" | "NETWORK"; status?: number; code?: string; message: string }
> {
  if (!input.token) {
    return { ok: false, error: "API_KEY_MISSING", message: "API key not configured" };
  }
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const found = await ikFetch(
    fetchImpl,
    searchUrl(),
    searchGetUrl(input.cnr),
    input.token,
    searchBody(input.cnr),
  );
  if (!found.ok) {
    return {
      ok: false,
      error: found.status === 0 ? "NETWORK" : "HTTP",
      status: found.status || undefined,
      code:
        found.status === 404
          ? "CASE_NOT_FOUND"
          : found.status === 429
            ? "RATE_LIMIT_EXCEEDED"
            : found.status === 401 || found.status === 403
              ? "INVALID_TOKEN"
              : undefined,
      message: found.message,
    };
  }
  const hits = parseSearchHits(found.json).slice(0, IK_MAX_DOCS);
  if (!hits.length) {
    return {
      ok: false,
      error: "HTTP",
      code: "CASE_NOT_FOUND",
      status: 404,
      message: "Indian Kanoon has no published document for this CNR.",
    };
  }
  const docs: IkDocument[] = [];
  for (const hit of hits) {
    const docUrl = documentUrl(hit.tid);
    const got = await callOnce(fetchImpl, docUrl, input.token, "GET");
    const docCall =
      got.ok || !shouldFallback(got)
        ? got
        : await callOnce(fetchImpl, docUrl, input.token, "POST");
    if (!docCall.ok) continue;
    const doc = parseDocument(docCall.json, hit);
    if (doc) docs.push(doc);
  }
  return { ok: true, hits, docs };
}

export function resolveIkAuth(env: NodeJS.Dict<string | undefined> = process.env) {
  return { token: resolveIkApiToken(env) };
}
