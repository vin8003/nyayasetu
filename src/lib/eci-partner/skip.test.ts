import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEMO_DISTRICT_CNR } from "../court-import/fixtures.ts";
import { SAMPLE_TITLES } from "../practice/sample-ids.ts";
import { p } from "../practice/copy.ts";
import { FIRST_STATE_PREFIXES } from "./types.ts";
import { isSampleCnr, shouldSkipSample } from "./skip.ts";
import { isBlankCnr, isFirstStateCnr, partnerCnrError } from "./cnr.ts";

describe("partner sample skip", () => {
  it("skips the sample chamber titles and case numbers", () => {
    assert.equal(shouldSkipSample({ title: SAMPLE_TITLES[0] }), true);
    assert.equal(shouldSkipSample({ caseNumber: "Bail 88/2026" }), true);
    assert.equal(shouldSkipSample({ facts: `Matter: ${SAMPLE_TITLES[2]}\nwrit` }), true);
  });

  it("skips the published demo CNR", () => {
    assert.equal(isSampleCnr(DEMO_DISTRICT_CNR), true);
    assert.equal(shouldSkipSample({ cnr: DEMO_DISTRICT_CNR }), true);
    assert.equal(shouldSkipSample({ cnr: "dlnd010012342025" }), true);
  });

  it("allows a real matter", () => {
    assert.equal(shouldSkipSample({ title: "Sharma v Verma", caseNumber: "CS 12/2025", cnr: "RJJP010000012025" }), false);
    assert.equal(isSampleCnr("RJJP010000012025"), false);
  });
});

describe("partner scope copy", () => {
  it("names RJ/UP/MP/Delhi first in both languages", () => {
    assert.deepEqual([...FIRST_STATE_PREFIXES], ["RJ", "UP", "MP", "DL"]);
    assert.match(p("en").eciFetchScope, /Rajasthan/i);
    assert.match(p("en").eciFetchScope, /Uttar Pradesh/i);
    assert.match(p("en").eciFetchScope, /Madhya Pradesh/i);
    assert.match(p("en").eciFetchScope, /Delhi/i);
    assert.match(p("hi").eciFetchScope, /राजस्थान/);
    assert.match(p("hi").eciFetchScope, /उत्तर प्रदेश/);
    assert.match(p("hi").eciFetchScope, /मध्य प्रदेश/);
    assert.match(p("hi").eciFetchScope, /दिल्ली/);
    assert.equal(isFirstStateCnr("RJJP010000012025"), true);
    assert.equal(isFirstStateCnr("UPAG010000012024"), true);
    assert.equal(isFirstStateCnr("MPJR010000012023"), true);
    assert.equal(isFirstStateCnr("DLHC010001232024"), true);
  });

  it("skips blank CNR", () => {
    assert.equal(isBlankCnr(""), true);
    assert.equal(partnerCnrError("   "), "BLANK_CNR");
    assert.equal(p("en").eciBlankCnr, "Enter a CNR.");
  });
});
