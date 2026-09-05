import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentUrl, fetchIkCase, IK_BASE, searchBody, searchGetUrl, searchUrl } from "./client.ts";
import { IK_DOC_FIXTURE, IK_LIVE_CNR, IK_LIVE_CNR_KAMRAN, IK_SEARCH_FIXTURE, IK_SEARCH_FIXTURE_KAMRAN } from "./fixture.ts";

const TOKEN = "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b";
const CNR = IK_LIVE_CNR;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockIk(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; method: string; auth: string; body: string; contentType: string }> = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const href = String(url);
    if (/ecourts\.gov\.in/i.test(href)) throw new Error(`refused eCourts ${href}`);
    if (!href.startsWith(`${IK_BASE}/`)) throw new Error(`refused non-IK URL ${href}`);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call = {
      url: href,
      method: String(init?.method ?? "GET"),
      auth: String(headers.Authorization ?? ""),
      body: String(init?.body ?? ""),
      contentType: String(headers["Content-Type"] ?? ""),
    };
    calls.push(call);
    return handler(href, init ?? {});
  };
  return { calls, fetchImpl };
}

describe("indian kanoon client", () => {
  it("does not call fetch without a token", async () => {
    let called = false;
    const result = await fetchIkCase({
      cnr: CNR,
      token: null,
      fetchImpl: async () => {
        called = true;
        return jsonResponse({});
      },
    });
    assert.equal(called, false);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "API_KEY_MISSING");
  });

  it("POSTs search then GET /doc/{tid}/ with Token auth against the live curl shape", async () => {
    const { calls, fetchImpl } = mockIk((url, init) => {
      if (url === searchUrl()) {
        assert.equal(init.method, "POST");
        return jsonResponse(IK_SEARCH_FIXTURE);
      }
      if (url === documentUrl("99098448")) {
        assert.equal(init.method, "GET");
        return jsonResponse(IK_DOC_FIXTURE);
      }
      if (url === documentUrl("106234790")) {
        return jsonResponse({
          tid: 106234790,
          publishdate: "2026-08-17",
          title: IK_SEARCH_FIXTURE.docs[1]?.title,
          doc: `<pre>CNR No. ${CNR} W.P.(C) 3418/2026 listed. Notice issued.</pre>`,
        });
      }
      return jsonResponse({ error: "unexpected" }, 404);
    });
    const result = await fetchIkCase({ cnr: CNR, token: TOKEN, fetchImpl });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.hits.length, 2);
    assert.equal(result.hits[0]?.tid, "99098448");
    assert.equal(result.docs.length, 2);
    assert.match(result.docs[0]?.body ?? "", /CNR No\. DLHC010097752026/);
    assert.equal(calls[0]?.url, searchUrl());
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.body, searchBody(CNR));
    assert.match(calls[0]?.contentType, /application\/x-www-form-urlencoded/);
    assert.equal(calls[1]?.url, documentUrl("99098448"));
    assert.equal(calls[1]?.method, "GET");
    assert.equal(calls.every((c) => c.auth === `Token ${TOKEN}`), true);
  });

  it("falls back to GET when POST is 405", async () => {
    const { calls, fetchImpl } = mockIk((url, init) => {
      if (init.method === "POST") return jsonResponse({ detail: "method" }, 405);
      if (url === searchGetUrl(CNR)) return jsonResponse(IK_SEARCH_FIXTURE);
      if (url === documentUrl("99098448")) return jsonResponse(IK_DOC_FIXTURE);
      if (url === documentUrl("106234790")) {
        return jsonResponse({
          tid: 106234790,
          publishdate: "2026-08-17",
          title: IK_SEARCH_FIXTURE.docs[1]?.title,
          doc: `<pre>CNR No. ${CNR} listed. Notice issued.</pre>`,
        });
      }
      return jsonResponse({ error: "unexpected" }, 404);
    });
    const result = await fetchIkCase({ cnr: CNR, token: TOKEN, fetchImpl });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(calls[0]?.method, "POST");
    assert.equal(calls[0]?.url, searchUrl());
    assert.equal(calls.some((c) => c.method === "GET" && c.url === searchGetUrl(CNR)), true);
  });

  it("retries POST when the first POST cannot reach the host", async () => {
    let posts = 0;
    const { calls, fetchImpl } = mockIk((url, init) => {
      if (init.method === "POST" && url === searchUrl() && posts++ === 0) {
        throw new Error("fetch failed", { cause: new Error("ECONNRESET") });
      }
      if (url === searchUrl() || url.startsWith(`${IK_BASE}/search/`)) return jsonResponse(IK_SEARCH_FIXTURE);
      if (url.includes("/doc/")) {
        return jsonResponse({
          tid: 99098448,
          publishdate: "2026-09-03",
          title: "Order",
          doc: `<pre>CNR No. ${CNR} listed. Notice issued.</pre>`,
        });
      }
      return jsonResponse({}, 404);
    });
    const result = await fetchIkCase({ cnr: CNR, token: TOKEN, fetchImpl });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(calls.filter((c) => c.method === "POST" && c.url === searchUrl()).length >= 2, true);
  });

  it("fetches all five Kamran hits, not a 3-doc cap", async () => {
    const { calls, fetchImpl } = mockIk((url) => {
      if (url.startsWith(`${IK_BASE}/search/`)) return jsonResponse(IK_SEARCH_FIXTURE_KAMRAN);
      const tid = url.match(/\/doc\/(\d+)\//)?.[1];
      return jsonResponse({
        tid: Number(tid),
        publishdate: "2026-09-03",
        title: "Kamran",
        doc: `<pre>CNR No. ${IK_LIVE_CNR_KAMRAN} CRL.A. 453/2023 listed. ${tid}</pre>`,
      });
    });
    const result = await fetchIkCase({ cnr: IK_LIVE_CNR_KAMRAN, token: TOKEN, fetchImpl });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.hits.length, 5);
    assert.equal(result.docs.length, 5);
    assert.equal(calls.filter((c) => c.url.includes("/doc/")).length, 5);
  });

  it("maps 403 without inventing a body", async () => {
    const { fetchImpl } = mockIk(() => jsonResponse({ error: "denied" }, 403));
    const result = await fetchIkCase({ cnr: CNR, token: TOKEN, fetchImpl });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "HTTP");
    assert.equal(result.code, "INVALID_TOKEN");
  });

  it("refuses live IK when fetchImpl is omitted in tests", async () => {
    const result = await fetchIkCase({ cnr: CNR, token: TOKEN });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /forbidden in tests/i);
  });
});
