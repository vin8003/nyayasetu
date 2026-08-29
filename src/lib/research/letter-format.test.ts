import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LegalMemo, Precedent } from "./types.ts";
import { assembleLetter, formatLegalLetter, formatLegalLetterHtml } from "./letter-format.ts";
import type { ParsedLetterDraft } from "./letter-parse.ts";
import { t } from "./copy.ts";

function caseRow(patch: Partial<Precedent> = {}): Precedent {
  return {
    title: "Arnesh Kumar v. State of Bihar",
    citation: "(2014) 8 SCC 273",
    court: "Supreme Court of India",
    year: "2014",
    ratio: "Arrest in 498A cases requires recorded reasons.",
    factsOverlap: "",
    holding: "",
    howToUse: "",
    url: "https://indiankanoon.org/doc/322621/",
    binding: "binding",
    verified: true,
    ...patch,
  };
}

const memo: LegalMemo = {
  title: "498A anticipatory bail",
  causeTitle: "Vivek v. State (Rajasthan HC)",
  courtsConsulted: [],
  factsSummary: "General 498A allegations, no injury.",
  issues: [],
  statutes: [],
  doctrines: [],
  precedents: [
    caseRow(),
    caseRow({
      title: "Invented Case",
      citation: "(2020) 1 SCC 1",
      url: "https://indiankanoon.org/doc/0/",
      verified: false,
    }),
  ],
  pointsForCourt: [],
  argumentsFor: [],
  argumentsAgainst: [],
  counters: [],
  strategy: "",
  risks: ["Interim protection may be conditional."],
  fullMemo: "Complete written opinion.",
  sources: [],
  unverified: ["Invented Case"],
  searchedQueries: [],
  citationUrls: ["https://indiankanoon.org/doc/322621/"],
};

const draft: ParsedLetterDraft = {
  heading: "Legal notice regarding 498A FIR",
  parties: "From: Vivek Sharma\nTo: Investigating Officer, Jodhpur",
  facts: "FIR with general allegations and no medical injury.",
  grounds: [
    {
      heading: "Arrest requires recorded reasons",
      text: "Mechanical arrest in 498A is impermissible.",
      citation: "(2014) 8 SCC 273",
      url: "https://indiankanoon.org/doc/322621/",
    },
    {
      heading: "Invented Case",
      text: "This fake ratio must not appear in the letter.",
      citation: "(2020) 1 SCC 1",
      url: "https://indiankanoon.org/doc/0/",
    },
  ],
  closing: "You are called upon to refrain from coercive process.",
  timeOrStand: "Fifteen days from receipt of this notice.",
  risks: "Interim protection may be conditional.",
};

describe("assembleLetter / formatLegalLetter", () => {
  it("notice includes parties, facts, verified citation+URL, demand, time to comply, risks, and disclaimer", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const text = formatLegalLetter(letter);
    assert.match(text, /Legal notice regarding 498A FIR/);
    assert.match(text, /Vivek Sharma/);
    assert.match(text, /general allegations/);
    assert.match(text, /\(2014\) 8 SCC 273/);
    assert.match(text, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    assert.match(text, /refrain from coercive process/);
    assert.match(text, /Fifteen days/);
    assert.match(text, /Interim protection may be conditional/);
    assert.match(text, /research assistance for advocates, not legal advice/i);
    assert.match(text, /Time to comply|time to comply/i);
    assert.doesNotMatch(text, /Without prejudice/i);
  });

  it("reply is without prejudice, para-wise, with a stand rather than a demand/time heading", () => {
    const letter = assembleLetter({
      kind: "reply",
      lang: "en",
      draft: {
        ...draft,
        heading: "Reply to legal notice",
        closing: "Each allegation is denied save what is expressly admitted.",
        timeOrStand: "The noticee will contest any coercive process.",
      },
      memo,
    });
    const text = formatLegalLetter(letter);
    assert.match(text, /Without prejudice/i);
    assert.match(text, /Reply to legal notice|para-wise/i);
    assert.match(text, /contest any coercive process/);
    assert.match(text, /Stand/i);
    assert.doesNotMatch(text, /Time to comply/i);
    assert.match(text, /\(2014\) 8 SCC 273/);
  });

  it("excludes unverified authorities from the assembled letter body", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const text = formatLegalLetter(letter);
    assert.doesNotMatch(text, /Invented Case/);
    assert.doesNotMatch(text, /indiankanoon\.org\/doc\/0/);
    assert.doesNotMatch(text, /\(2020\) 1 SCC 1/);
    assert.doesNotMatch(text, /fake ratio/);
  });

  it("uses Hindi labels and the Hindi disclaimer when the memo language is hi", () => {
    const letter = assembleLetter({ kind: "notice", lang: "hi", draft, memo });
    const text = formatLegalLetter(letter);
    const hi = t("hi");
    assert.match(text, new RegExp(hi.disclaimer.slice(0, 20)));
    assert.match(text, /पक्षकार|तथ्य|माँग|पालन/);
  });

  it("wraps the letter as downloadable HTML for Word", () => {
    const letter = assembleLetter({ kind: "notice", lang: "en", draft, memo });
    const html = formatLegalLetterHtml(letter);
    assert.match(html, /<!DOCTYPE html>/);
    assert.match(html, /498A/);
    assert.match(html, /indiankanoon/);
  });
});
