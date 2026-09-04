import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { guessCourtId, lookupFromMatter } from "./lookup.ts";
import { validateCourtLookup } from "./courts.ts";

describe("sync lookup from an existing matter", () => {
  it("splits a district case number and keeps the CNR", () => {
    const { courtId, lookup } = lookupFromMatter({
      cnr: "DLND010012342025",
      caseNumber: "CS 184/2025",
      courtName: "Tis Hazari District Court, Delhi",
      courtSourceId: "district-ecourts",
    });
    assert.equal(courtId, "district-ecourts");
    assert.equal(lookup.cnr, "DLND010012342025");
    assert.equal(lookup.caseType, "CS");
    assert.equal(lookup.caseNumber, "184");
    assert.equal(lookup.year, "2025");
    assert.equal(validateCourtLookup(courtId, lookup).ok, true);
  });

  it("guesses Delhi High Court from the court name", () => {
    assert.equal(guessCourtId("Delhi High Court", ""), "delhi-hc");
    const { lookup } = lookupFromMatter({
      cnr: "",
      caseNumber: "W.P.(C) 3312/2025",
      courtName: "High Court of Delhi",
      courtSourceId: "",
    });
    assert.equal(lookup.caseType, "W.P.(C)");
    assert.equal(lookup.caseNumber, "3312");
  });
});
