import assert from "node:assert/strict";
import test from "node:test";
import { askCaseContext, askResponsesBody, askSystem, clip, researchBrief, type AskCase } from "./prompt.ts";

const empty: AskCase = {
  title: "A v B",
  courtName: "Delhi High Court",
  caseNumber: "W.P.(C) 1/2026",
  cnr: "DLHC010000012026",
  stage: "notice",
  ourSide: "petitioner",
  parties: "petitioner, A",
  notes: "x".repeat(2000),
  nextHearingOn: "",
  hearings: [],
  orders: [{ orderDate: "2026-03-17", confirmed: false, body: "Stay refused." }],
  tasks: [],
  deadlines: [],
};

test("ask searches the same legal domains as research", () => {
  const body = askResponsesBody({
    model: "grok-4.20-0309-reasoning",
    lang: "en",
    file: null,
    messages: [{ role: "user", content: "Does section 138 still need a notice?" }],
  });
  assert.equal(body.tools[0]?.type, "web_search");
  assert.ok(body.tools[0]?.filters.allowed_domains.includes("indiankanoon.org"));
  assert.match(body.instructions, /Bharatiya Nyaya Sanhita/);
  assert.match(body.instructions, /Never invent a citation/);
  assert.match(askSystem("hi"), /Hindi/);
  assert.equal("temperature" in body, false);
});

test("a research memo is carried into the chat and its links stay reusable", () => {
  const brief = researchBrief({
    title: "Discharge",
    fullMemo: "The injured person was discharged.",
    citationUrls: ["https://indiankanoon.org/doc/123/"],
  });
  const body = askResponsesBody({
    model: "grok-4.20-0309-reasoning",
    lang: "en",
    file: null,
    research: brief.text,
    priorSources: brief.urls,
    messages: [{ role: "user", content: "What if custody is disputed?" }],
  });
  const preface = body.input[0]?.content ?? "";
  assert.match(preface, /Continue it/);
  assert.match(preface, /indiankanoon\.org\/doc\/123/);
});

test("unconfirmed orders stay labelled and notes are clipped", () => {
  const text = askCaseContext(empty);
  assert.match(text, /\[UNCONFIRMED\]/);
  assert.doesNotMatch(text, /\[CONFIRMED\]/);
  assert.ok(clip(empty.notes, 1200).endsWith("…"));
  assert.ok(text.length < empty.notes.length);
});
