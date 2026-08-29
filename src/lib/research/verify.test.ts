import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Precedent } from "./types.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
import { stampPrecedents } from "./verify.ts";

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

describe("stampPrecedents", () => {
  it("marks verified when the URL is in citationUrls and the host is allowed", () => {
    const url = "https://indiankanoon.org/doc/322621/";
    const { precedents, unverified } = stampPrecedents([caseRow({ url, verified: false })], [url]);
    assert.equal(precedents[0]?.verified, true);
    assert.deepEqual(unverified, []);
  });

  it("overwrites a model verified=true when the URL was not retrieved", () => {
    const { precedents, unverified } = stampPrecedents(
      [caseRow({ verified: true, url: "https://indiankanoon.org/doc/999/" })],
      ["https://indiankanoon.org/doc/322621/"],
    );
    assert.equal(precedents[0]?.verified, false);
    assert.equal(unverified.length, 1);
    assert.match(unverified[0] ?? "", /Arnesh Kumar/);
  });

  it("treats www, trailing slash, and hash as the same URL", () => {
    const { precedents } = stampPrecedents(
      [caseRow({ url: "https://www.indiankanoon.org/doc/322621#ratio" })],
      ["https://indiankanoon.org/doc/322621/"],
    );
    assert.equal(precedents[0]?.verified, true);
  });

  it("rejects a retrieved URL whose host is not in LEGAL_DOMAINS", () => {
    const url = "https://example.com/judgment/1";
    const { precedents, unverified } = stampPrecedents([caseRow({ url, verified: true })], [url]);
    assert.equal(precedents[0]?.verified, false);
    assert.equal(unverified.length, 1);
  });

  it("rejects an empty or invalid URL even if the model marked it verified", () => {
    const a = stampPrecedents([caseRow({ url: "", verified: true })], [""]);
    assert.equal(a.precedents[0]?.verified, false);
    const b = stampPrecedents([caseRow({ url: "not a url", verified: true })], ["not a url"]);
    assert.equal(b.precedents[0]?.verified, false);
  });

  it("merges existing unverified notes without duplicates", () => {
    const { unverified } = stampPrecedents(
      [caseRow({ title: "Missing case", url: "https://indiankanoon.org/doc/1/", verified: true })],
      [],
      ["Missing case"],
    );
    assert.deepEqual(unverified, ["Missing case"]);
  });

  it("exports the five search hosts used by web_search", () => {
    assert.deepEqual([...LEGAL_DOMAINS], [
      "indiankanoon.org",
      "livelaw.in",
      "casemine.com",
      "judgments.ecourts.gov.in",
      "sci.gov.in",
    ]);
  });
});
