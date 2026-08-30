import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LETTER_MAX_OUTPUT_TOKENS,
  LETTER_SYSTEM,
  LETTER_TIMEOUT_MS,
  buildLetterUser,
  letterXaiBody,
} from "./letter-prompt.ts";
import type { Intake, LegalMemo, Precedent } from "./types.ts";

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

const intake: Intake = {
  facts: "FIR with general 498A allegations, no injury. Police issued a notice for questioning.",
  query: "Does anticipatory bail lie?",
  courtId: "rajasthan",
  area: "criminal",
  side: "petitioner",
  lang: "en",
};

const memo: LegalMemo = {
  title: "498A anticipatory bail",
  causeTitle: "Vivek v. State",
  courtsConsulted: [],
  factsSummary: "General 498A allegations, no injury.",
  issues: [{ issue: "Does 438 lie?", framing: "Whether arrest is justified." }],
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
  argumentsFor: ["No specific dates or injury."],
  argumentsAgainst: ["Dowry demand is alleged."],
  counters: [],
  strategy: "File 438/482.",
  risks: ["Interim protection may be conditional."],
  fullMemo: "Opinion.",
  sources: [],
  unverified: ["Invented Case"],
  searchedQueries: [],
  citationUrls: ["https://indiankanoon.org/doc/322621/"],
};

describe("LETTER_SYSTEM", () => {
  it("forbids web_search and any other tools", () => {
    assert.doesNotMatch(LETTER_SYSTEM, /web_search/);
    assert.match(LETTER_SYSTEM, /do not (search|use tools)|no tools|must not search/i);
  });

  it("allows citations only from the verified list supplied in the user message", () => {
    assert.match(LETTER_SYSTEM, /verified/i);
    assert.match(LETTER_SYSTEM, /only/i);
  });
});

describe("letter budget and xAI body", () => {
  it("uses a shorter abort and token cap than research, with no tools key", () => {
    assert.ok(LETTER_MAX_OUTPUT_TOKENS <= 4000);
    assert.ok(LETTER_TIMEOUT_MS <= 45_000);
    const body = letterXaiBody(LETTER_SYSTEM, "user");
    assert.equal("tools" in body, false);
    assert.doesNotMatch(JSON.stringify(body), /web_search/);
    assert.equal(body.max_output_tokens, LETTER_MAX_OUTPUT_TOKENS);
  });
});

describe("buildLetterUser", () => {
  it("lists only verified authorities and tells the model not to cite unverified names", () => {
    const user = buildLetterUser({ kind: "notice", intake, memo });
    assert.match(user, /Arnesh Kumar/);
    assert.match(user, /indiankanoon\.org\/doc\/322621/);
    assert.doesNotMatch(user, /Invented Case/);
    assert.doesNotMatch(user, /indiankanoon\.org\/doc\/0/);
    assert.match(user, /English/);
  });

  it("asks for a petition shape when kind is petition, without a notice demand", () => {
    const user = buildLetterUser({ kind: "petition", intake, memo });
    assert.match(user, /petition|याचिका/i);
    assert.match(user, /prayer|verification|interim/i);
    assert.doesNotMatch(user, /time to comply/i);
    assert.match(user, /Arnesh Kumar/);
    assert.doesNotMatch(user, /Invented Case/);
  });

  it("asks for a written statement shape when kind is writtenStatement, without a notice demand", () => {
    const user = buildLetterUser({
      kind: "writtenStatement",
      intake: { ...intake, side: "respondent" },
      memo,
    });
    assert.match(user, /written statement/i);
    assert.match(user, /preliminary|verification|para-wise|prayer/i);
    assert.doesNotMatch(user, /time to comply/i);
    assert.match(user, /Arnesh Kumar/);
    assert.doesNotMatch(user, /Invented Case/);
    assert.match(user, /Side: respondent/);
  });

  it("asks for a reply shape when kind is reply, in the memo language", () => {
    const user = buildLetterUser({
      kind: "reply",
      intake: { ...intake, lang: "hi" },
      memo,
    });
    assert.match(user, /Hindi|हिंदी|हिन्दी/);
    assert.match(user, /reply|जवाब|without prejudice/i);
    assert.match(user, /time to comply/i);
    assert.match(user, /verification/i);
    assert.doesNotMatch(user, /Invented Case/);
  });

  it("includes forum, cause title, and memo statutes in the user message", () => {
    const user = buildLetterUser({
      kind: "petition",
      intake,
      memo: {
        ...memo,
        causeTitle: "Vivek v. State (Rajasthan HC)",
        statutes: [
          { name: "BNSS", sections: "482", why: "Anticipatory bail.", url: "" },
        ],
      },
    });
    assert.match(user, /Rajasthan High Court/);
    assert.match(user, /Vivek v\. State \(Rajasthan HC\)/);
    assert.match(user, /BNSS/);
    assert.match(user, /482/);
    assert.match(user, /Anticipatory bail/);
    assert.match(user, /Statutes the memo relied on \(do not treat these as case authorities\):/);
    assert.doesNotMatch(user, /web_search/);
  });

  it("does not treat the All Indian courts intake default as a named forum", () => {
    const user = buildLetterUser({
      kind: "writtenStatement",
      intake: { ...intake, courtId: "all", side: "respondent" },
      memo,
    });
    assert.match(user, /Forum: not specified — take the court from the cause title; do not invent one/);
    assert.match(user, /Side: respondent/);
    assert.doesNotMatch(user, /All Indian courts/);
  });

  it("skips blank statute rows so the prompt does not emit empty dashes", () => {
    const user = buildLetterUser({
      kind: "petition",
      intake,
      memo: {
        ...memo,
        statutes: [
          { name: "", sections: "", why: "", url: "" },
          { name: "   ", sections: "482", why: "noise", url: "" },
          { name: "BNSS", sections: "482", why: "Anticipatory bail.", url: "" },
        ],
      },
    });
    assert.doesNotMatch(user, /^- :/m);
    assert.doesNotMatch(user, /- {2,}482/);
    assert.match(user, /- BNSS 482: Anticipatory bail\./);
  });
});
