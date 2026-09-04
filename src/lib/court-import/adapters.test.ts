import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { continueFromPaste, getAdapter, searchCourt } from "./adapters.ts";
import { DEMO_DISTRICT_CNR, DEMO_HC_CASE, SAMPLE_ECOURTS_PASTE } from "./fixtures.ts";
import { COURT_SOURCES } from "./courts.ts";

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
    assert.ok(result.case.sourceUrl.includes("ecourts.gov.in"));
  });

  it("retrieves the Delhi High Court demo by type/number/year", () => {
    const result = searchCourt("delhi-hc", { caseType: "W.P.(C)", caseNumber: "3312", year: "2025" });
    assert.equal(result.kind, "found");
    if (result.kind !== "found") return;
    assert.equal(result.demo, true);
    assert.equal(result.case.caseNumber, DEMO_HC_CASE);
    assert.ok(result.orders.length >= 3);
  });

  it("returns CAPTCHA_REQUIRED for a live identifier and does not invent a case", () => {
    const result = searchCourt("district-ecourts", { cnr: "DLND019999992025" });
    assert.equal(result.kind, "captcha");
    if (result.kind !== "captcha") return;
    assert.match(result.message, /CAPTCHA/i);
    assert.match(result.officialUrl, /ecourts\.gov\.in/);
  });

  it("continues from pasted official case status", () => {
    const result = continueFromPaste("district-ecourts", SAMPLE_ECOURTS_PASTE);
    assert.equal(result.kind, "found");
    if (result.kind !== "found") return;
    assert.equal(result.demo, false);
    assert.match(result.case.caseNumber, /90/);
    assert.ok(result.orders.length >= 1);
    assert.equal(result.case.parties[0]?.name.includes("MALHOTRA") || result.case.parties.length > 0, true);
  });
});
