import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAdapter, searchCourt } from "./adapters.ts";
import * as adapters from "./adapters.ts";
import { DEMO_DISTRICT_CNR, DEMO_HC_CASE } from "./fixtures.ts";
import { COURT_SOURCES } from "./courts.ts";
import { isForbiddenCourtUrl } from "./forbidden.ts";

describe("court adapter selection", () => {
  it("registers district eCourts and Delhi High Court", () => {
    assert.equal(COURT_SOURCES.length, 2);
    assert.ok(getAdapter("district-ecourts"));
    assert.ok(getAdapter("delhi-hc"));
    assert.equal(getAdapter("unknown"), undefined);
  });

  it("retrieves the published district demo without hitting a live site", () => {
    const result = searchCourt("district-ecourts", { cnr: DEMO_DISTRICT_CNR });
    assert.equal(result.kind, "found");
    if (result.kind !== "found") return;
    assert.equal(result.demo, true);
    assert.equal(result.case.cnr, DEMO_DISTRICT_CNR);
    assert.ok(result.orders.length >= 5);
    assert.ok(result.orders.some((o) => o.available === false));
    assert.equal(isForbiddenCourtUrl(result.case.sourceUrl), false);
    assert.equal(result.orders.every((o) => !isForbiddenCourtUrl(o.sourceUrl)), true);
  });

  it("retrieves the Delhi High Court demo by type/number/year", () => {
    const result = searchCourt("delhi-hc", { caseType: "W.P.(C)", caseNumber: "3312", year: "2025" });
    assert.equal(result.kind, "found");
    if (result.kind !== "found") return;
    assert.equal(result.demo, true);
    assert.equal(result.case.caseNumber, DEMO_HC_CASE);
    assert.ok(result.orders.length >= 3);
    assert.equal(isForbiddenCourtUrl(result.case.sourceUrl), false);
  });

  it("refuses a live identifier instead of opening court CAPTCHA", () => {
    const result = searchCourt("district-ecourts", { cnr: "DLND019999992025" });
    assert.equal(result.kind, "error");
    if (result.kind !== "error") return;
    assert.match(result.message, /Partner API/i);
    assert.doesNotMatch(result.message, /Complete it there|upload the orders/i);
  });

  it("does not offer a paste-status handoff", () => {
    assert.equal("continueFromPaste" in adapters, false);
  });
});
