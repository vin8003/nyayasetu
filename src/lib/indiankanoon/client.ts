/**
 * Indian Kanoon API client.
 * Auth: Authorization: Token <IKANOON_API_TOKEN>
 * Search/doc are POST (what their live API accepts). Never scrape eCourts.gov.in.
 * Unit tests must pass fetchImpl.
 */
import { isForbiddenCourtUrl } from "../court-import/forbidden.ts";
import { ikAuthHeaders, resolveIkApiToken } from "./key.ts";
import { parseDocument, parseSearchHits } from "./parse.ts";
import { IK_MAX_DOCS, type IkDocument, type IkSearchHit } from "./types.ts";

export const IK_BASE = "https://api.indiankanoon.org";
const TIMEOUT_MS = 30000;
type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

function defaultFetch(input: string, init?: RequestInit): Promise<Response> {
  if (process.env.NODE_TEST_CONTEXT) {
    throw new Error("Live Indian Kanoon API is forbidden in tests. Pass fetchImpl with a mock.");
  }
  return fetch(input, init);
}

export function searchUrl(): string {
  return `${IK_BASE}/search/`;
}

export function documentUrl(tid: string): string {
  const id = tid.replace(/[^0-9A-Za-z._-]/g, "");
  return `${IK_BASE}/doc/${id}/`;
}

export function searchBody(cnr: string): string {
  return new URLSearchParams({ formInput: cnr, pagenum: "0" }).toString();
}

async function ikFetch(
  fetchImpl: FetchImpl,
  url: string,
  token: string,
  body?: string,
): Promise<{ ok: true; json: unknown; status: number } | { ok: false; status: number; message: string }> {
  if (isForbiddenCourtUrl(url) || /ecourts\.gov\.in/i.test(url)) {
    return { ok: false, status: 0, message: "CiteBench does not fetch from the official eCourts site." };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { ...ikAuthHeaders(token) };
    if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
    const response = await fetchImpl(url, {
      method: "POST",
      headers,
      body,
      redirect: "follow",
      signal: controller.signal,
    });
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
      const message =
        response.status === 403
          ? "Indian Kanoon rejected the token."
          : response.status === 429
            ? "Indian Kanoon rate limit — try again in a minute."
            : response.status === 405
              ? "Indian Kanoon rejected the request method."
              : "Could not fetch from Indian Kanoon.";
      return { ok: false, status: response.status, message };
    }
    return { ok: true, json, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "network";
    if (message.includes("forbidden in tests")) {
      return { ok: false, status: 0, message };
    }
    return { ok: false, status: 0, message: "Could not reach Indian Kanoon." };
  } finally {
    clearTimeout(timer);
  }
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
  const found = await ikFetch(fetchImpl, searchUrl(), input.token, searchBody(input.cnr));
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
            : found.status === 403
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
    const got = await ikFetch(fetchImpl, documentUrl(hit.tid), input.token);
    if (!got.ok) continue;
    const doc = parseDocument(got.json, hit);
    if (doc) docs.push(doc);
  }
  return { ok: true, hits, docs };
}

export function resolveIkAuth(env: NodeJS.Dict<string | undefined> = process.env) {
  return { token: resolveIkApiToken(env) };
}
