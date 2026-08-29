import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RESEARCH_MAX_OUTPUT_TOKENS, RESEARCH_SYSTEM, RESEARCH_TIMEOUT_MS } from "./prompt.ts";

describe("RESEARCH_SYSTEM", () => {
  it("defaults the precedent example to verified false so the model does not rubber-stamp", () => {
    assert.match(RESEARCH_SYSTEM, /"verified": false/);
    assert.doesNotMatch(RESEARCH_SYSTEM, /"verified": true/);
  });
});

describe("research budget", () => {
  it("raises output tokens above the old 4k cap and pairs a longer abort", () => {
    assert.ok(RESEARCH_MAX_OUTPUT_TOKENS >= 8000);
    assert.ok(RESEARCH_TIMEOUT_MS >= 90_000);
  });
});
