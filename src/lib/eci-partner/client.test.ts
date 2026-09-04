/** Partner HTTP client tests — mocked responses only. Do not call the live API. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchPartnerCase } from "./client.ts";
import { PARTNER_CASE_FIXTURE, FIXTURE_CNR } from "./fixture.ts";
import { jsonResponse, mockPartnerFetch, PARTNER_TEST_HOST } from "./mock.ts";
import { ECI_BASE } from "./types.ts";

const KEY = "eci_live_unit_test_token";

describe("partner HTTP client", () => {
  it("refuses without a key and does not call fetch", async () => {
    let called = 0;
    const result = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: null,
      fetchImpl: async () => {
        called += 1;
        return jsonResponse({});
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "API_KEY_MISSING");
    assert.match(result.message, /API key not configured/i);
    assert.equal(called, 0);
  });

  it("rejects a blank CNR without calling fetch", async () => {
    let called = 0;
    const result = await fetchPartnerCase({
      cnr: "  ",
      apiKey: KEY,
      fetchImpl: async () => {
        called += 1;
        return jsonResponse({});
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "BLANK_CNR");
    assert.equal(called, 0);
  });

  it("GETs only the Partner API host from a mock", async () => {
    const { calls, fetchImpl } = mockPartnerFetch(() => jsonResponse(PARTNER_CASE_FIXTURE));
    const result = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      fetchImpl,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(
      calls.map((c) => c.url),
      [`${ECI_BASE}/api/partner/case/${FIXTURE_CNR}`],
    );
    assert.equal(calls[0]?.url, `${PARTNER_TEST_HOST}/api/partner/case/RJJP010000012025`);
    assert.equal(calls[0]?.method, "GET");
    assert.equal(calls[0]?.authorization, `Bearer ${KEY}`);
    assert.equal(calls.some((c) => /ecourts\.gov\.in/i.test(c.url)), false);
  });

  it("queues refresh on the Partner path then GETs the case", async () => {
    const { calls, fetchImpl } = mockPartnerFetch((call) => {
      if (call.method === "POST") {
        return jsonResponse({ data: { status: "QUEUED" }, meta: { request_id: "r0" } }, 202);
      }
      return jsonResponse(PARTNER_CASE_FIXTURE);
    });
    const result = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      refresh: true,
      fetchImpl,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.refreshed, true);
    assert.deepEqual(
      calls.map((c) => c.url),
      [`${ECI_BASE}/api/partner/case/${FIXTURE_CNR}/refresh`, `${ECI_BASE}/api/partner/case/${FIXTURE_CNR}`],
    );
  });

  it("maps 401/404/429/500 from mocks without inventing a body", async () => {
    const notFound = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      fetchImpl: mockPartnerFetch(() =>
        jsonResponse({ error: { code: "CASE_NOT_FOUND", message: "gone" }, meta: { request_id: "r1" } }, 404),
      ).fetchImpl,
    });
    assert.equal(notFound.ok, false);
    if (notFound.ok) return;
    assert.equal(notFound.code, "CASE_NOT_FOUND");
    assert.match(notFound.message, /No case/i);

    const unauth = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      fetchImpl: mockPartnerFetch(() => jsonResponse({ error: { code: "INVALID_TOKEN" }, meta: { request_id: "r2" } }, 401))
        .fetchImpl,
    });
    assert.equal(unauth.ok, false);
    if (unauth.ok) return;
    assert.equal(unauth.error, "HTTP");
    assert.match(unauth.message, /eCourtsIndia/i);
    assert.equal(unauth.message.includes(KEY), false);

    const limited = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      fetchImpl: mockPartnerFetch(() =>
        jsonResponse({ error: { code: "RATE_LIMIT_EXCEEDED" }, meta: { request_id: "r3" } }, 429),
      ).fetchImpl,
    });
    assert.equal(limited.ok, false);
    if (limited.ok) return;
    assert.equal(limited.code, "RATE_LIMIT_EXCEEDED");
    assert.equal(limited.status, 429);

    const server = await fetchPartnerCase({
      cnr: FIXTURE_CNR,
      apiKey: KEY,
      fetchImpl: async () => new Response("<html>internal error</html>", { status: 500 }),
    });
    assert.equal(server.ok, false);
    if (server.ok) return;
    assert.equal(server.error, "HTTP");
    assert.equal(server.status, 500);
    assert.equal(/<html>|internal error/.test(server.message), false);
  });

  it("does not call the live Partner API when fetchImpl is omitted in tests", async () => {
    const result = await fetchPartnerCase({ cnr: FIXTURE_CNR, apiKey: KEY });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "NETWORK");
    assert.match(result.message, /forbidden in tests|Pass fetchImpl/i);
  });
});
