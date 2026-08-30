import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyTaskDraft, draftFromBundle, formatTaskDraft } from "./task-draft-class.ts";
import { buildSampleChamber } from "./sample.ts";
import { intakeFromMatter } from "./intake-from-matter.ts";
import type { MatterBundle } from "./types.ts";

describe("classifyTaskDraft", () => {
  const pack = buildSampleChamber();

  it("drafts filings and leaves court-appearance / gather work alone", () => {
    const byTitle = Object.fromEntries(
      [...pack.tasks, ...pack.deadlines].map((row) => [row.title, classifyTaskDraft(row.title, row.sourceQuote)]),
    );
    const kindOf = (needle: string) => {
      const title = Object.keys(byTitle).find((t) => t.includes(needle));
      assert.ok(title, needle);
      return byTitle[title];
    };
    assert.deepEqual(kindOf("process-server affidavit of Shri Naresh"), { draftable: true, kind: "affidavit" });
    assert.deepEqual(kindOf("Order XIII-A"), { draftable: true, kind: "application" });
    assert.deepEqual(kindOf("oral bail arguments"), { draftable: true, kind: "note" });
    assert.deepEqual(kindOf("short note distinguishing Uma Devi"), { draftable: true, kind: "note" });
    assert.deepEqual(kindOf("Defendant WS"), { draftable: true, kind: "writtenStatement" });
    assert.deepEqual(kindOf("Process-server affidavit if Apex"), { draftable: true, kind: "affidavit" });
    assert.deepEqual(kindOf("Default-bail clock"), { draftable: true, kind: "petition" });
    assert.deepEqual(kindOf("stay of 19 Aug"), { draftable: true, kind: "application" });
    assert.equal(kindOf("Diary 16 Dec").draftable, false);
    assert.equal(kindOf("Get the remand papers").draftable, false);
    assert.equal(kindOf("Keep father and maternal uncle").draftable, false);
    assert.equal(kindOf("Compile the six appointment").draftable, false);
    assert.equal(kindOf("Charge-sheet watch").draftable, false);
  });
});

describe("draftFromBundle", () => {
  it("builds a written-statement skeleton from the Sharma file", () => {
    const pack = buildSampleChamber();
    const matter = pack.matters.find((m) => m.title.includes("Apex"))!;
    const bundle = {
      matter,
      hearings: pack.hearings.filter((h) => h.matterId === matter.id),
      documents: (pack.documents ?? []).filter((d) => d.matterId === matter.id),
      orders: (pack.orders ?? []).filter((o) => o.matterId === matter.id),
      tasks: pack.tasks.filter((t) => t.matterId === matter.id),
      deadlines: pack.deadlines.filter((d) => d.matterId === matter.id),
      timeline: pack.events.filter((e) => e.matterId === matter.id),
    } as unknown as MatterBundle;
    const item = pack.deadlines.find((d) => d.title.includes("Defendant WS"))!;
    const draft = draftFromBundle(bundle, item, "writtenStatement");
    const text = formatTaskDraft(draft);
    assert.match(text, /Apex/i);
    assert.match(text, /PRAYER/);
    assert.match(text, /VERIFICATION/);
    assert.match(text, /Not legal advice/);
    assert.match(text, /written statement|120/i);
    // intake still works on the same bundle so research and this draft share facts
    assert.match(intakeFromMatter(bundle, "en").facts, /Apex/);
  });
});
