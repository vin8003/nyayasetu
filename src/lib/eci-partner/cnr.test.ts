import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isBlankCnr, isFirstStateCnr, isValidCnr, normalizeCnr, partnerCnrError } from "./cnr.ts";
import { FIXTURE_CNR } from "./fixture.ts";

describe("partner CNR validate", () => {
  it("accepts a 16-character CNR and strips hyphens", () => {
    assert.equal(isValidCnr(FIXTURE_CNR), true);
    assert.equal(normalizeCnr("rj-jp-01-000001-2025"), FIXTURE_CNR);
    assert.equal(partnerCnrError(FIXTURE_CNR), null);
  });

  it("rejects blank and short values", () => {
    assert.equal(isBlankCnr(""), true);
    assert.equal(isBlankCnr("   "), true);
    assert.equal(partnerCnrError(""), "BLANK_CNR");
    assert.equal(partnerCnrError("RJJP01"), "INVALID_CNR");
    assert.equal(isValidCnr(""), false);
  });

  it("marks RJ/UP/MP/Delhi as first-state without blocking others", () => {
    assert.equal(isFirstStateCnr("RJJP010000012025"), true);
    assert.equal(isFirstStateCnr("UPAG010000012024"), true);
    assert.equal(isFirstStateCnr("MPJR010000012023"), true);
    assert.equal(isFirstStateCnr("DLHC010001232024"), true);
    assert.equal(isFirstStateCnr("MHAU010000012024"), false);
  });
});
