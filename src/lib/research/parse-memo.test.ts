import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseResearchMemo } from "./parse-memo.ts";

const valid = `{
  "title": "498A anticipatory bail",
  "causeTitle": "Vivek v. State",
  "factsSummary": "FIR with general allegations.",
  "issues": [{"issue": "Does 438 lie?", "framing": "Whether arrest is justified."}],
  "precedents": [{
    "title": "Arnesh Kumar",
    "citation": "(2014) 8 SCC 273",
    "court": "SC",
    "year": "2014",
    "ratio": "Reasons for arrest.",
    "factsOverlap": "498A",
    "holding": "Directions.",
    "howToUse": "Oppose mechanical arrest.",
    "url": "https://indiankanoon.org/doc/322621/",
    "binding": "binding",
    "verified": true
  }],
  "fullMemo": "Opinion under 800 words. Research assistance, not legal advice."
}`;

describe("parseResearchMemo", () => {
  it("parses a complete JSON object", () => {
    const memo = parseResearchMemo(valid);
    assert.equal(memo.title, "498A anticipatory bail");
    assert.equal(memo.precedents[0]?.title, "Arnesh Kumar");
    assert.equal(memo.precedents[0]?.verified, true);
  });

  it("parses fenced JSON", () => {
    const memo = parseResearchMemo("```json\n" + valid + "\n```");
    assert.equal(memo.title, "498A anticipatory bail");
  });

  it("throws PARSE on truncated JSON instead of a prose dump", () => {
    const truncated = valid.slice(0, 80);
    assert.throws(() => parseResearchMemo(truncated), { message: "PARSE" });
  });

  it("throws PARSE on labelled prose with no JSON object", () => {
    assert.throws(
      () => parseResearchMemo("**Title:** Bail memo\n**Facts Summary:** An FIR was lodged."),
      { message: "PARSE" },
    );
  });

  it("throws PARSE on empty text", () => {
    assert.throws(() => parseResearchMemo("   "), { message: "PARSE" });
  });
});
