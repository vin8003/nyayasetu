/**
 * Indian Kanoon API client.
 * Auth: Authorization: Token <IKANOON_API_TOKEN>
 * Search/doc: GET first (official docs). POST if GET is 405 or the GET socket dies.
 * Never scrape eCourts.gov.in. Unit tests must pass fetchImpl.
 */
import { isForbiddenCourtUrl } from "../court-import/forbidden.ts";
import { ikAuthHeaders, resolveIkApiToken } from "./key.ts";
import { parseDocument, parseSearchHits } from "./parse.ts";
import { IK_MAX_DOCS, type IkDocument, type IkSearchHit } from "./types.ts";

export const IK_BASE = "https://api.indiankanoon.org";
const TIMEOUT_MS = 30000;
type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;
type IkCall =
  | { ok: true; json: unknown; status: number }
  | { ok: false; status: number; message: string };

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (process.env.NODE_TEST_CONTEXT) {
    throw new Error("Live Indian Kanoon API is forbidden in tests. Pass fetchImpl with a mock.");
  }
  return fetch(input, init);
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
  const raw = `${err.message} ${cause}`.toLowerCase();
  if (err.name === "AbortError" || raw.includes("abort")) {
    return "Indian Kanoon timed out. Try again in a minute.";
  }
  if (raw.includes("enotfound") || raw.includes("dns")) {
    return "Could not resolve Indian Kanoon.";
  }
  if (raw.includes("cert") || raw.includes("ssl") || raw.includes("tls")) {
    return "Could not establish a TLS session with Indian Kanoon.";
  }
  if (raw.includes("econnreset") || raw.includes("econnrefused") || raw.includes("fetch failed")) {
    return "Could not reach Indian Kanoon (connection reset).";
  }
  return "Could not reach Indian Kanoon.";
}

function httpMessage(status: number): string {
  if (status === 401 || status === 403) return "Indian Kanoon rejected the token.";
  if (status === 429) return "Indian Kanoon rate limit — try again in a minute.";
  if (status === 405) return "Indian Kanoon rejected the request method.";
  if (status === 404) return "Indian Kanoon has no published document for this CNR.";
  return "Could not fetch from Indian Kanoon.";
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const headers: Record<string, string> = {
    ...ikAuthHeaders(token),
    "Accept-Language": "en-IN,en;q=0.9",
  };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  const init: RequestInit = {
    method,
    headers,
    body,
    redirect: "follow",
    signal: controller.signal,
  };
  try {
    let response: Response;
    try {
      response = await fetchImpl(url, init);
    } catch (first) {
      const text = first instanceof Error ? first.message : "";
      if (init.signal && /signal|abortcontroller/i.test(text) && !/aborted/i.test(text)) {
        const { signal: _s, ...rest } = init;
        response = await fetchImpl(url, rest);
      } else {
        throw first;
      }
    }
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
  } finally {
    clearTimeout(timer);
  }
}

/** GET first (docs + live 401-without-token). POST if GET is 405 or the socket dies. */
async function ikFetch(
  fetchImpl: FetchImpl,
  getUrl: string,
  postUrl: string,
  token: string,
  postBody?: string,
): Promise<IkCall> {
  const get = await callOnce(fetchImpl, getUrl, token, "GET");
  if (get.ok) return get;
  const tryPost = get.status === 405 || get.status === 0 || get.status === 501;
  if (!tryPost) return get;
  const post = await callOnce(fetchImpl, postUrl, token, "POST", postBody);
  if (post.ok) return post;
  if (get.status === 0 && post.status !== 0) return post;
  if (post.status === 0 && get.status !== 0) return get;
  return post.status !== 0 ? post : get;
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
    searchGetUrl(input.cnr),
    searchUrl(),
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
    const got = await ikFetch(fetchImpl, docUrl, docUrl, input.token);
    if (!got.ok) continue;
    const doc = parseDocument(got.json, hit);
    if (doc) docs.push(doc);
  }
  return { ok: true, hits, docs };
}

export function resolveIkAuth(env: NodeJS.Dict<string | undefined> = process.env) {
  return { token: resolveIkApiToken(env) };
}
