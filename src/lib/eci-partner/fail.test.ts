import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyParseResult, fetchErrorResult, missingKeyResult } from "./fail.ts";
import { planInboxLand } from "./land.ts";
import { parsePartnerCase } from "./parse.ts";

describe("partner fail closed", () => {
  it("missing key is a clear API-key-not-configured fetch_error", () => {
    const result = missingKeyResult();
    assert.equal(result.ok, false);
    assert.equal(result.error, "API_KEY_MISSING");
    assert.equal(result.status, "fetch_error");
    assert.equal(result.message, "API key not configured");
  });

  it("maps 4xx and 5xx to fetch_error without a body", () => {
    const notFound = fetchErrorResult(
      { ok: false, error: "HTTP", status: 404, code: "CASE_NOT_FOUND", message: "No case for that CNR." },
      "RJJP010000012025",
    );
    assert.equal(notFound.status, "fetch_error");
    assert.equal("body" in notFound, false);

    const server = fetchErrorResult(
      { ok: false, error: "HTTP", status: 500, code: "HTTP_500", message: "Could not fetch from eCourtsIndia." },
      "RJJP010000012025",
    );
    assert.equal(server.status, "fetch_error");
    assert.equal(server.error, "HTTP");
  });

  it("empty parse is needs_human and does not invent a body", () => {
    const parsed = parsePartnerCase({ data: { courtCaseData: { cnr: "RJJP010000012025" }, historyOfCaseHearings: [] } });
    const plan = planInboxLand(parsed.orders, []);
    assert.equal(plan.empty, true);
    const result = emptyParseResult("RJJP010000012025");
    assert.equal(result.status, "needs_human");
    assert.equal(result.error, "EMPTY_PARSE");
    assert.match(result.message, /Nothing was invented/);
    assert.equal(plan.toLand.length, 0);
  });
});
