import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { LegalMemo, Precedent } from "./types.ts";
import { citablePrecedentsFromMemo, filterLetterGrounds, scrubUnverifiedText } from "./letter-cites.ts";

function caseRow(patch: Partial<Precedent> = {}): Precedent {
  return {
    title: "Arnesh Kumar v. State of Bihar",
    citation: "(2014) 8 SCC 273",
    court: "Supreme Court of India",
    year: "2014",
    ratio: "Arrest in 498A cases requires recorded reasons.",
    factsOverlap: "Cruelty FIR, no injury.",
    holding: "Directions on arrest.",
    howToUse: "Cite against mechanical arrest.",
    url: "https://indiankanoon.org/doc/322621/",
    binding: "binding",
    verified: true,
    ...patch,
  };
}

function memoFrom(precedents: Precedent[], citationUrls: string[]): LegalMemo {
  return {
    title: "498A anticipatory bail",
    causeTitle: "Vivek v. State",
    courtsConsulted: ["Supreme Court of India"],
    factsSummary: "General 498A allegations, no injury.",
    issues: [],
    statutes: [],
    doctrines: [],
    precedents,
    pointsForCourt: [],
    argumentsFor: [],
    argumentsAgainst: [],
    counters: [],
    strategy: "",
    risks: [],
    fullMemo: "Research assistance, not legal advice.",
    sources: [],
    unverified: [],
    searchedQueries: [],
    citationUrls,
  };
}

describe("citablePrecedentsFromMemo", () => {
  it("keeps a precedent only when verified after re-stamp against citationUrls on an allowed host", () => {
    const url = "https://indiankanoon.org/doc/322621/";
    const citable = citablePrecedentsFromMemo(
      memoFrom([caseRow({ url, verified: true })], [url]),
    );
    assert.equal(citable.length, 1);
    assert.equal(citable[0]?.title, "Arnesh Kumar v. State of Bihar");
    assert.equal(citable[0]?.verified, true);
  });

  it("drops a client-forged verified flag when the URL was never in citationUrls", () => {
    const citable = citablePrecedentsFromMemo(
      memoFrom(
        [caseRow({ verified: true, url: "https://indiankanoon.org/doc/999/" })],
        ["https://indiankanoon.org/doc/322621/"],
      ),
    );
    assert.deepEqual(citable, []);
  });

  it("re-stamps so a retrieved allowlisted URL is citable even if the client sent verified:false", () => {
    const url = "https://indiankanoon.org/doc/322621/";
    const citable = citablePrecedentsFromMemo(
      memoFrom([caseRow({ url, verified: false })], [url]),
    );
    assert.equal(citable.length, 1);
  });

  it("drops a precedent whose URL is not in citationUrls", () => {
    const citable = citablePrecedentsFromMemo(
      memoFrom(
        [caseRow({ title: "Invented Case", url: "https://indiankanoon.org/doc/0/", verified: false })],
        ["https://indiankanoon.org/doc/322621/"],
      ),
    );
    assert.deepEqual(citable, []);
  });

  it("drops javascript: URLs even when listed in citationUrls and marked verified", () => {
    const url = "javascript://indiankanoon.org/doc/322621/";
    const citable = citablePrecedentsFromMemo(
      memoFrom([caseRow({ url, verified: true })], [url]),
    );
    assert.deepEqual(citable, []);
  });

  it("treats www, trailing slash, and hash as the same retrieved URL", () => {
    const citable = citablePrecedentsFromMemo(
      memoFrom(
        [caseRow({ url: "https://www.indiankanoon.org/doc/322621#ratio" })],
        ["https://indiankanoon.org/doc/322621/"],
      ),
    );
    assert.equal(citable.length, 1);
  });
});

describe("filterLetterGrounds", () => {
  const arnesh = caseRow();
  const citable = [arnesh];

  it("keeps a ground whose URL matches a citable precedent and rewrites cite fields from the memo", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "No mechanical arrest",
          text: "Police must record reasons.",
          citation: "wrong cite",
          url: "https://www.indiankanoon.org/doc/322621/",
        },
      ],
      citable,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.citation, "(2014) 8 SCC 273");
    assert.equal(kept[0]?.url, "https://indiankanoon.org/doc/322621/");
    assert.equal(kept[0]?.heading, "No mechanical arrest");
  });

  it("attaches the memo URL when the ground cites the same reporter but omits a URL", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "Arnesh Kumar",
          text: "Directions on 498A arrest.",
          citation: "(2014) 8 SCC 273",
          url: "",
        },
      ],
      citable,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.url, "https://indiankanoon.org/doc/322621/");
  });

  it("drops a ground with an invented URL that is not on the citable list", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "Invented Case",
          text: "A fake holding.",
          citation: "(2020) 1 SCC 1",
          url: "https://indiankanoon.org/doc/0/",
        },
      ],
      citable,
    );
    assert.deepEqual(kept, []);
  });

  it("drops a ground that only names an unverified case", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "Invented Case",
          text: "Should never reach the letter.",
          citation: "Invented Case",
          url: "",
        },
      ],
      citable,
    );
    assert.deepEqual(kept, []);
  });

  it("keeps a ground that states the law without a case cite", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "General allegations",
          text: "Vague 498A pleadings do not justify mechanical arrest.",
          citation: "",
          url: "",
        },
      ],
      citable,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.url, "");
    assert.equal(kept[0]?.citation, "");
    assert.match(kept[0]?.text ?? "", /mechanical arrest/);
  });

  it("drops javascript: ground URLs", () => {
    const kept = filterLetterGrounds(
      [
        {
          heading: "XSS",
          text: "no",
          citation: "(2014) 8 SCC 273",
          url: "javascript://indiankanoon.org/doc/322621/",
        },
      ],
      citable,
    );
    assert.deepEqual(kept, []);
  });
});

describe("scrubUnverifiedText", () => {
  it("does not leave a hanging preposition after stripping an unverified name from a verification clause", () => {
    const out = scrubUnverifiedText(
      "I verify this petition and rely on Invented Case (2020) 1 SCC 1.",
      ["Invented Case", "(2020) 1 SCC 1"],
    );
    assert.match(out, /I verify this petition/);
    assert.doesNotMatch(out, /Invented Case/);
    assert.doesNotMatch(out, /\(2020\) 1 SCC 1/);
    assert.doesNotMatch(out, /rely on\s*\./i);
  });

  it("does not leave a dangling 'and' after stripping an unverified URL from a notice demand", () => {
    const out = scrubUnverifiedText(
      "See also https://indiankanoon.org/doc/0/ and Invented Case.",
      ["https://indiankanoon.org/doc/0/", "Invented Case"],
    );
    assert.doesNotMatch(out, /Invented Case/);
    assert.doesNotMatch(out, /indiankanoon\.org\/doc\/0/);
    assert.doesNotMatch(out, /\band\s*\./i);
  });
});
