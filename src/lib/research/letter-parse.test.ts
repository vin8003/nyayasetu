import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLetterDraft } from "./letter-parse.ts";

const valid = `{
  "heading": "Legal notice regarding 498A FIR",
  "parties": "From: Vivek Sharma\\nTo: Investigating Officer, Jodhpur",
  "facts": "FIR with general allegations and no medical injury.",
  "grounds": [{
    "heading": "Arrest requires recorded reasons",
    "text": "Mechanical arrest in 498A is impermissible.",
    "citation": "(2014) 8 SCC 273",
    "url": "https://indiankanoon.org/doc/322621/"
  }],
  "closing": "You are called upon to drop coercive process.",
  "timeOrStand": "Fifteen days from receipt of this notice.",
  "risks": "Interim protection may be conditional."
}`;

describe("parseLetterDraft", () => {
  it("parses a complete JSON object", () => {
    const draft = parseLetterDraft(valid);
    assert.equal(draft.heading, "Legal notice regarding 498A FIR");
    assert.equal(draft.grounds[0]?.citation, "(2014) 8 SCC 273");
    assert.match(draft.closing, /coercive process/);
    assert.equal(draft.verification, "");
  });

  it("captures a petition verification clause when present", () => {
    const draft = parseLetterDraft(
      valid.replace(
        '"risks": "Interim protection may be conditional."',
        `"verification": "I, Vivek Sharma, do hereby verify that the contents are true to my knowledge.",
  "risks": "Interim protection may be conditional."`,
      ),
    );
    assert.match(draft.verification, /true to my knowledge/);
  });

  it("parses fenced JSON", () => {
    const draft = parseLetterDraft("```json\n" + valid + "\n```");
    assert.equal(draft.heading, "Legal notice regarding 498A FIR");
  });

  it("throws PARSE on truncated JSON instead of shipping a prose dump", () => {
    assert.throws(() => parseLetterDraft(valid.slice(0, 80)), { message: "PARSE" });
  });

  it("throws PARSE on labelled prose with no JSON object", () => {
    assert.throws(
      () => parseLetterDraft("**Heading:** Notice\n**Facts:** An FIR was lodged."),
      { message: "PARSE" },
    );
  });

  it("throws PARSE on empty text", () => {
    assert.throws(() => parseLetterDraft("   "), { message: "PARSE" });
  });

  it("throws PARSE on an empty JSON object", () => {
    assert.throws(() => parseLetterDraft("{}"), { message: "PARSE" });
  });

  it("throws PARSE on a heading-only object with no letter body", () => {
    assert.throws(() => parseLetterDraft('{"heading":"partial"}'), { message: "PARSE" });
  });
});
