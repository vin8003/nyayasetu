import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  groupMemoHistory,
  memoMatchesQuery,
  threadsMatchingQuery,
} from "./history-search.ts";
import type { HistoryItem, Intake, LegalMemo } from "./types.ts";

const intake: Intake = {
  facts: "Accused Rakesh Kumar of Palam is in JC on FIR 142/2026 PS Palam under IPC 307.",
  query: "Does regular bail lie at this stage?",
  courtId: "delhi",
  area: "criminal",
  side: "petitioner",
  lang: "en",
};

function memo(partial: Partial<LegalMemo> = {}): LegalMemo {
  return {
    title: "Bail in State v Rakesh",
    causeTitle: "Rakesh Kumar v. State (NCT of Delhi)",
    courtsConsulted: ["Delhi High Court"],
    factsSummary: "Regular bail after a 307 FIR.",
    issues: [{ issue: "Whether regular bail is made out.", framing: "Section 439 CrPC." }],
    statutes: [],
    doctrines: [],
    precedents: [],
    pointsForCourt: [],
    argumentsFor: [],
    argumentsAgainst: [],
    counters: [],
    strategy: "",
    risks: [],
    fullMemo: "Bail note for the Palam FIR.",
    sources: [],
    unverified: [],
    searchedQueries: [],
    citationUrls: [],
    ...partial,
  };
}

function item(partial: Partial<HistoryItem> & Pick<HistoryItem, "id" | "createdAt">): HistoryItem {
  return {
    title: partial.title ?? "Bail in State v Rakesh",
    intake: partial.intake ?? intake,
    memo: partial.memo ?? memo(),
    parentId: partial.parentId ?? null,
    ...partial,
  };
}

describe("memoMatchesQuery", () => {
  const row = item({ id: "a", createdAt: "2026-08-01T10:00:00.000Z" });

  it("matches cause title, party, facts, and court name", () => {
    assert.equal(memoMatchesQuery(row, "Rakesh Kumar v. State"), true);
    assert.equal(memoMatchesQuery(row, "palam"), true);
    assert.equal(memoMatchesQuery(row, "Delhi High Court"), true);
    assert.equal(memoMatchesQuery(row, "दिल्ली"), true);
    assert.equal(memoMatchesQuery(row, "anticipatory"), false);
  });

  it("treats a one-character query as no filter", () => {
    assert.equal(memoMatchesQuery(row, "x"), true);
    assert.equal(memoMatchesQuery(row, "  "), true);
  });
});

describe("groupMemoHistory", () => {
  it("groups nested follow-ups under the original memo and bubbles the newest", () => {
    const parent = item({ id: "p", createdAt: "2026-08-01T10:00:00.000Z", title: "Original" });
    const child = item({
      id: "c",
      createdAt: "2026-08-02T10:00:00.000Z",
      parentId: "p",
      title: "Follow-up 1",
      memo: memo({ title: "Follow-up 1" }),
    });
    const grand = item({
      id: "g",
      createdAt: "2026-08-03T10:00:00.000Z",
      parentId: "c",
      title: "Follow-up 2",
      memo: memo({ title: "Follow-up 2" }),
    });
    const other = item({
      id: "o",
      createdAt: "2026-08-01T12:00:00.000Z",
      title: "Other brief",
      memo: memo({ title: "Other brief", causeTitle: "Ram v Shyam" }),
    });
    const threads = groupMemoHistory([grand, child, other, parent]);
    assert.equal(threads.length, 2);
    assert.equal(threads[0].root.id, "p");
    assert.deepEqual(
      threads[0].children.map((row) => row.id),
      ["c", "g"],
    );
    assert.equal(threads[1].root.id, "o");
  });

  it("keeps an orphan follow-up as its own root when the parent is missing", () => {
    const orphan = item({
      id: "c",
      createdAt: "2026-08-02T10:00:00.000Z",
      parentId: "missing",
      title: "Orphan",
    });
    const threads = groupMemoHistory([orphan]);
    assert.equal(threads.length, 1);
    assert.equal(threads[0].root.id, "c");
    assert.equal(threads[0].children.length, 0);
  });
});

describe("threadsMatchingQuery", () => {
  it("keeps the parent when only the follow-up matches", () => {
    const parent = item({
      id: "p",
      createdAt: "2026-08-01T10:00:00.000Z",
      memo: memo({ causeTitle: "Rakesh Kumar v. State", factsSummary: "Bail after 307." }),
    });
    const child = item({
      id: "c",
      createdAt: "2026-08-02T10:00:00.000Z",
      parentId: "p",
      intake: { ...intake, query: "What if the injured has been discharged?" },
      memo: memo({ title: "Discharge follow-up", causeTitle: "Rakesh Kumar v. State" }),
    });
    const threads = threadsMatchingQuery([parent, child], "discharged");
    assert.equal(threads.length, 1);
    assert.equal(threads[0].root.id, "p");
    assert.equal(threads[0].children[0].id, "c");
  });
});
