import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { documentUrl, fetchIkCase, IK_BASE, searchBody, searchUrl } from "./client.ts";
import { IK_DOC_FIXTURE, IK_LIVE_CNR, IK_LIVE_CNR_KAMRAN, IK_SEARCH_FIXTURE, IK_SEARCH_FIXTURE_KAMRAN } from "./fixture.ts";
import { documentsToOrders, parseDocument, parseSearchHits, stripHtml } from "./parse.ts";

const TOKEN = "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b";
const CNR = IK_LIVE_CNR;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function mockIk(handler: (url: string, init: RequestInit) => Response) {
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

  it("POSTs search then POST /doc/{tid}/ with Token auth against the live shape", async () => {
    const { calls, fetchImpl } = mockIk((url, init) => {
      assert.equal(init.method, "POST");
      if (url === searchUrl()) return jsonResponse(IK_SEARCH_FIXTURE);
      if (url === documentUrl("99098448")) return jsonResponse(IK_DOC_FIXTURE);
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
    assert.match(result.docs[0]?.body ?? "", /W\.P\.\(C\) 3418\/2026/);
    assert.equal(calls[0]?.url, `${IK_BASE}/search/`);
    assert.equal(calls[0]?.body, searchBody(CNR));
    assert.match(calls[0]?.contentType, /application\/x-www-form-urlencoded/);
    assert.equal(calls[1]?.url, documentUrl("99098448"));
    assert.equal(calls[1]?.body, "");
    assert.equal(calls.every((c) => c.method === "POST"), true);
    assert.equal(calls.every((c) => c.auth === `Token ${TOKEN}`), true);
  });

  it("fetches all five Kamran hits, not a 3-doc cap", async () => {
    const { calls, fetchImpl } = mockIk((url) => {
      if (url === searchUrl()) return jsonResponse(IK_SEARCH_FIXTURE_KAMRAN);
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

describe("indian kanoon parse", () => {
  it("reads the live search fixture (numeric tid, found as string)", () => {
    const hits = parseSearchHits(IK_SEARCH_FIXTURE);
    assert.equal(hits.length, 2);
    assert.equal(hits[0]?.tid, "99098448");
    assert.equal(hits[1]?.tid, "106234790");
    assert.match(hits[0]?.headline ?? "", /DLHC010097752026/);
    assert.equal(hits[0]?.docsource, "Delhi High Court");
  });

  it("reads the Kamran live search (5 hits, extra author/bench fields, two CNRs in one headline)", () => {
    const hits = parseSearchHits(IK_SEARCH_FIXTURE_KAMRAN);
    assert.equal(hits.length, 5);
    assert.deepEqual(
      hits.map((h) => h.tid),
      ["128126463", "154666654", "183191039", "169597730", "151126340"],
    );
    assert.equal(hits.every((h) => h.headline.includes(IK_LIVE_CNR_KAMRAN)), true);
    assert.match(hits[3]?.headline ?? "", /DLHC010236102026/);
  });

  it("strips the live HTML doc and lands CNR-matching order text", () => {
    assert.equal(stripHtml("<p>Issue&nbsp;notice & list</p>"), "Issue notice & list");
    const hits = parseSearchHits(IK_SEARCH_FIXTURE);
    const doc = parseDocument(IK_DOC_FIXTURE, hits[0]!);
    assert.ok(doc);
    assert.match(doc?.body ?? "", /CNR No\. DLHC010097752026/);
    assert.match(doc?.body ?? "", /HON'BLE MR\. JUSTICE ANIL KSHETARPAL/);
    const orders = documentsToOrders([doc!], CNR);
    assert.equal(orders.length, 1);
    assert.equal(orders[0]?.externalId, "ik:99098448");
    assert.equal(orders[0]?.orderDate, "2026-09-03");
    assert.equal(orders[0]?.available, true);
  });
});
