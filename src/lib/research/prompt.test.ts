import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RESEARCH_MAX_OUTPUT_TOKENS,
  RESEARCH_MAX_TOOL_CALLS,
  RESEARCH_SYSTEM,
  RESEARCH_TIMEOUT_MS,
  buildResearchUser,
  webResearchXaiBody,
} from "./prompt.ts";
import { DEFAULT_FAST_MODEL, DEFAULT_RESEARCH_MODEL } from "../ai/models.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";
import type { Intake } from "./types.ts";

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

describe("research prompt quality", () => {
  it("states the BNS/BNSS/BSA changeover, a search plan and a no-padding rule", () => {
    assert.match(RESEARCH_SYSTEM, /BNSS/);
    assert.match(RESEARCH_SYSTEM, /1 July 2024/);
    assert.match(RESEARCH_SYSTEM, /Plan targeted searches/);
    assert.match(RESEARCH_SYSTEM, /Never pad/);
    for (const host of LEGAL_DOMAINS) assert.ok(RESEARCH_SYSTEM.includes(host));
  });

  it("puts the language rule, today's date and the forum in the user message", () => {
    const intake: Intake = {
      facts: "Cheque of Rs 5 lakh dishonoured for insufficient funds; notice sent within 30 days.",
      query: "Is the complaint within time?",
      courtId: "delhi",
      area: "criminal",
      side: "petitioner",
      lang: "hi",
    };
    const user = buildResearchUser(intake, new Date("2026-02-10T20:00:00Z"));
    assert.match(user, /Devanagari/);
    assert.match(user, /2026-02-11/);
    assert.match(user, /Delhi High Court/);
    assert.match(user, /Is the complaint within time\?/);
  });
});

describe("webResearchXaiBody", () => {
  const base = {
    instructions: RESEARCH_SYSTEM,
    user: "facts",
    maxOutputTokens: RESEARCH_MAX_OUTPUT_TOKENS,
    schemaName: "research_memo",
  };

  it("uses the reasoning model with a strict schema, more searches and no temperature", () => {
    const body = webResearchXaiBody({ ...base, model: DEFAULT_RESEARCH_MODEL });
    assert.equal(body.model, DEFAULT_RESEARCH_MODEL);
    assert.equal("temperature" in body, false);
    assert.equal(body.max_tool_calls, RESEARCH_MAX_TOOL_CALLS);
    assert.equal(body.text.format.type, "json_schema");
    assert.deepEqual(body.tools?.[0]?.filters.allowed_domains, [...LEGAL_DOMAINS]);
  });

  it("keeps temperature for a non-reasoning override", () => {
    const body = webResearchXaiBody({ ...base, model: DEFAULT_FAST_MODEL });
    assert.equal(body.temperature, 0.2);
  });

  it("falls back to the exact pre-upgrade request shape", () => {
    const body = webResearchXaiBody({ ...base, model: DEFAULT_RESEARCH_MODEL, legacy: true });
    assert.equal(body.model, DEFAULT_FAST_MODEL);
    assert.equal(body.max_tool_calls, 3);
    assert.equal(body.temperature, 0.2);
    assert.deepEqual(body.text, { format: { type: "json_object" } });
  });

  it("runs a repair turn without search", () => {
    const body = webResearchXaiBody({ ...base, model: DEFAULT_RESEARCH_MODEL, repair: { previous: "{bad" } });
    assert.equal("tools" in body, false);
    assert.equal(body.input.length, 3);
  });
});
