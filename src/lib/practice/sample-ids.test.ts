import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_TITLES, isSampleMatter, isSampleTitle, looksLikeSample } from "./sample-ids.ts";

describe("sample-ids", () => {
  it("identifies sample titles without loading the chamber pack", () => {
    assert.equal(isSampleTitle(SAMPLE_TITLES[0]), true);
    assert.equal(isSampleMatter({ caseNumber: "Bail 88/2026" }), true);
    assert.equal(looksLikeSample({ facts: `Matter: ${SAMPLE_TITLES[1]}\nFIR.` }), true);
    assert.equal(isSampleMatter({ title: "Other", caseNumber: "CS 1/2026" }), false);
  });
});
