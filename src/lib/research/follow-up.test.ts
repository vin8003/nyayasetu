import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FOLLOWUP_SYSTEM,
  FOLLOWUP_MAX_OUTPUT_TOKENS,
  FOLLOWUP_TIMEOUT_MS,
  buildFollowUpUser,
  followUpIntake,
  mergeCitationUrls,
} from "./follow-up-prompt.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
import type { Intake, LegalMemo } from "./types.ts";

const intake: Intake = {
  facts: "Accused Rakesh Kumar, 28, of Palam, is in JC since 12 August 2026 on FIR 142/2026 PS Palam under IPC 307. No prior conviction. Recovered knife is the only article.",
  query: "Does regular bail lie at this stage?",
  courtId: "delhi",
  area: "criminal",
  side: "petitioner",
  lang: "en",
};

const memo: LegalMemo = {
  title: "Bail in State v Rakesh",
  causeTitle: "Rakesh Kumar v. State (NCT of Delhi)",
  courtsConsulted: ["Delhi High Court"],
  factsSummary: "Regular bail after a 307 FIR.",
  issues: [{ issue: "Whether regular bail is made out on the Palam FIR.", framing: "Section 439 CrPC." }],
  statutes: [],
  doctrines: [],
  precedents: [
    {
      title: "Arnesh Kumar v. State of Bihar",
      citation: "(2014) 8 SCC 273",
      court: "Supreme Court",
      year: "2014",
      ratio: "Arrest is not automatic.",
      factsOverlap: "Personal liberty.",
      holding: "Section 41 checklist.",
      howToUse: "On over-arrest.",
      url: "https://indiankanoon.org/doc/322621/",
      binding: "binding",
      verified: true,
    },
    {
      title: "Invented Case",
      citation: "(2099) 1 SCC 1",
      court: "Supreme Court",
      year: "2099",
      ratio: "Fake ratio",
      factsOverlap: "",
      holding: "",
      howToUse: "",
      url: "https://example.com/fake",
      binding: "persuasive",
      verified: false,
    },
  ],
  pointsForCourt: [],
  argumentsFor: [],
  argumentsAgainst: [],
  counters: [],
  strategy: "",
  risks: [],
  fullMemo: "Bail note.",
  sources: [],
  unverified: ["Invented Case"],
  searchedQueries: ["regular bail 307 delhi"],
  citationUrls: ["https://indiankanoon.org/doc/322621/"],
};

describe("FOLLOWUP_SYSTEM", () => {
  it("defaults the precedent example to verified false and keeps Indian search hosts", () => {
    assert.match(FOLLOWUP_SYSTEM, /"verified": false/);
    assert.doesNotMatch(FOLLOWUP_SYSTEM, /"verified": true/);
    assert.match(FOLLOWUP_SYSTEM, /follow-up/i);
    for (const host of LEGAL_DOMAINS) assert.match(FOLLOWUP_SYSTEM, new RegExp(host.replace(/\./g, "\\.")));
  });

  it("pairs the same abort and token cap as a full research run", () => {
    assert.ok(FOLLOWUP_MAX_OUTPUT_TOKENS >= 8000);
    assert.ok(FOLLOWUP_TIMEOUT_MS >= 90_000);
  });
});

describe("buildFollowUpUser", () => {
  it("reuses facts and verified cites, asks the new question, and does not feed invented names as authorities", () => {
    const user = buildFollowUpUser({
      intake,
      memo,
      question: "What if the injured has been discharged and there is no dying declaration?",
    });
    assert.match(user, /follow-up/i);
    assert.match(user, /What if the injured has been discharged/);
    assert.match(user, /Does regular bail lie at this stage/);
    assert.match(user, /Accused Rakesh Kumar/);
    assert.match(user, /Delhi High Court/);
    assert.match(user, /Arnesh Kumar/);
    assert.match(user, /https:\/\/indiankanoon\.org\/doc\/322621\//);
    const verifiedBlock = user.slice(
      user.indexOf("Verified authorities"),
      user.indexOf("Unverified names"),
    );
    assert.match(verifiedBlock, /Arnesh Kumar/);
    assert.doesNotMatch(verifiedBlock, /Invented Case/);
    assert.match(user, /Unverified names[\s\S]*Invented Case/);
    assert.doesNotMatch(user, /web_search/);
  });

  it("followUpIntake keeps facts and court, and replaces the legal question", () => {
    const next = followUpIntake(intake, "  Argue from the respondent side on custody.  ");
    assert.equal(next.facts, intake.facts);
    assert.equal(next.courtId, "delhi");
    assert.equal(next.query, "Argue from the respondent side on custody.");
  });
});

describe("mergeCitationUrls", () => {
  it("keeps parent retrievals so a reused cite can stay verified", () => {
    const merged = mergeCitationUrls(
      ["https://indiankanoon.org/doc/322621/", "https://indiankanoon.org/doc/322621/"],
      ["https://indiankanoon.org/doc/999/"],
    );
    assert.deepEqual(merged, [
      "https://indiankanoon.org/doc/999/",
      "https://indiankanoon.org/doc/322621/",
    ]);
  });

  it("can fold parent precedent URLs into the retrieved set", () => {
    const merged = mergeCitationUrls(
      [memo.citationUrls[0], memo.precedents[0].url, ""],
      ["https://indiankanoon.org/doc/999/"],
    );
    assert.deepEqual(merged, [
      "https://indiankanoon.org/doc/999/",
      "https://indiankanoon.org/doc/322621/",
    ]);
  });
});
