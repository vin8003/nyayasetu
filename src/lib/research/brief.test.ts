import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMemoBrief, formatMemoBriefHtml } from "./brief.ts";
import type { LegalMemo } from "./types.ts";

const memo: LegalMemo = {
  title: "498A anticipatory bail",
  causeTitle: "Vivek v. State (Rajasthan HC)",
  courtsConsulted: ["Supreme Court of India"],
  factsSummary: "General 498A allegations, no injury.",
  issues: [{ issue: "Does anticipatory bail lie?", framing: "Whether arrest is justified." }],
  statutes: [{ name: "BNSS", sections: "482", why: "Anticipatory bail.", url: "" }],
  doctrines: [],
  precedents: [
    {
      title: "Arnesh Kumar",
      citation: "(2014) 8 SCC 273",
      court: "SC",
      year: "2014",
      ratio: "Reasons for arrest.",
      factsOverlap: "",
      holding: "",
      howToUse: "",
      url: "https://indiankanoon.org/doc/322621/",
      binding: "binding",
      verified: true,
    },
    {
      title: "Invented Case",
      citation: "(2020) 1 SCC 1",
      court: "SC",
      year: "2020",
      ratio: "",
      factsOverlap: "",
      holding: "",
      howToUse: "",
      url: "https://indiankanoon.org/doc/0/",
      binding: "persuasive",
      verified: false,
    },
  ],
  pointsForCourt: [],
  argumentsFor: ["No specific dates or injury."],
  argumentsAgainst: ["Dowry demand is alleged."],
  counters: ["General allegations are insufficient."],
  strategy: "File 438/482 with Arnesh Kumar.",
  risks: ["Interim protection may be conditional."],
  fullMemo: "Complete written opinion. This is research assistance, not legal advice.",
  sources: [{ title: "Arnesh Kumar", url: "https://indiankanoon.org/doc/322621/", publisher: "Indian Kanoon" }],
  unverified: ["Invented Case"],
  searchedQueries: ["498A anticipatory bail Arnesh Kumar"],
  citationUrls: ["https://indiankanoon.org/doc/322621/"],
};

describe("formatMemoBrief", () => {
  it("includes title, facts, issues, authorities with verified flag, arguments, and disclaimer", () => {
    const text = formatMemoBrief(memo, "en");
    assert.match(text, /498A anticipatory bail/);
    assert.match(text, /General 498A allegations/);
    assert.match(text, /Does anticipatory bail lie\?/);
    assert.match(text, /\(2014\) 8 SCC 273/);
    assert.match(text, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    assert.match(text, /verified/);
    assert.match(text, /unverified|not verified/i);
    assert.match(text, /No specific dates or injury/);
    assert.match(text, /research assistance for advocates, not legal advice/i);
  });

  it("wraps the brief as downloadable HTML for Word", () => {
    const html = formatMemoBriefHtml(memo, "en");
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /498A anticipatory bail/);
    assert.match(html, /&lt;|&amp;|Arnesh Kumar/);
  });
});
