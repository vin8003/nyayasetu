import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { districtLookupError, highCourtLookupError, isValidCnr } from "./validate.ts";
import { DEMO_DISTRICT_CNR } from "./fixtures.ts";

describe("case number validation", () => {
  it("accepts a 16-character CNR with or without hyphens", () => {
    assert.equal(isValidCnr(DEMO_DISTRICT_CNR), true);
    assert.equal(isValidCnr("DLND01-001234-2025"), true);
    assert.equal(isValidCnr("DLND01"), false);
    assert.equal(isValidCnr(""), false);
  });

  it("requires CNR or type+number+year for district courts", () => {
    assert.equal(districtLookupError({ cnr: DEMO_DISTRICT_CNR }), null);
    assert.equal(districtLookupError({ caseType: "CS", caseNumber: "184", year: "2025" }), null);
    assert.match(districtLookupError({ caseNumber: "184" }) ?? "", /CNR|type/i);
    assert.match(districtLookupError({ cnr: "nope" }) ?? "", /16/);
  });

  it("requires type, number and year for Delhi High Court", () => {
    assert.equal(highCourtLookupError({ caseType: "W.P.(C)", caseNumber: "3312", year: "2025" }), null);
    assert.match(highCourtLookupError({ caseType: "W.P.(C)" }) ?? "", /type, number and year/i);
  });
});
