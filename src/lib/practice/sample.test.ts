import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSampleChamber, SAMPLE_TITLES, isSampleMatter, looksLikeSample } from "./sample.ts";
import { extractResearchQuestion, intakeFromMatter } from "./intake-from-matter.ts";

describe("sample chamber depth", () => {
  it("ships three titled matters with research-ready notes, papers and orders", () => {
    const pack = buildSampleChamber();
    assert.equal(pack.matters.length, 3);
    assert.equal(pack.matters.map((m) => m.title).join("|"), SAMPLE_TITLES.join("|"));
    for (const m of pack.matters) {
      assert.ok(m.notes.length > 1200, m.title);
      const q = extractResearchQuestion(m.notes);
      assert.ok(q.length >= 40, m.title);
    }
    assert.ok(pack.documents && pack.documents.length >= 6);
    assert.ok(pack.orders && pack.orders.length >= 3);
    assert.ok(pack.hearings.length >= 8);
    assert.ok(pack.events.length >= 10);
    assert.ok(pack.tasks.length >= 6);
  });

  it("prefills a research intake that is long enough to run a memo", () => {
    const pack = buildSampleChamber();
    const matter = pack.matters[1];
    const intake = intakeFromMatter(
      {
        matter: {
          ...matter,
          clientName: "Rakesh Kumar",
          createdAt: "",
          updatedAt: "",
        },
        hearings: pack.hearings.filter((h) => h.matterId === matter.id) as never,
        tasks: pack.tasks.filter((t) => t.matterId === matter.id) as never,
        deadlines: pack.deadlines.filter((d) => d.matterId === matter.id) as never,
        documents: pack.documents
          ?.filter((d) => d.matterId === matter.id)
          .map((d) => ({
            id: d.id,
            matterId: d.matterId,
            kind: d.kind,
            title: d.title,
            text: d.body,
            sourceKind: d.sourceKind ?? "paste",
            createdAt: "",
          })),
        orders: pack.orders
          ?.filter((o) => o.matterId === matter.id)
          .map((o) => ({
            id: o.id,
            matterId: o.matterId,
            documentId: o.documentId ?? null,
            orderDate: o.orderDate,
            body: o.body,
            directions: o.directions,
            confirmed: o.confirmed,
            createdAt: "",
          })),
      },
      "en",
    );
    assert.equal(intake.courtId, "rajasthan");
    assert.equal(intake.area, "criminal");
    assert.equal(intake.side, "respondent");
    assert.match(intake.query, /regular bail/i);
    assert.match(intake.facts, /318\(4\)/);
    assert.match(intake.facts, /FIR 173\/2026/);
    assert.match(intake.facts, /1\.8 lakh|1,80,000|₹1\.8/);
    assert.ok(intake.facts.length > 2000);
    assert.equal(looksLikeSample({ facts: intake.facts }), true);
    assert.equal(looksLikeSample({ title: SAMPLE_TITLES[0] }), true);
    assert.equal(looksLikeSample({ title: "Ram v Shyam" }), false);
    assert.equal(looksLikeSample({ facts: "A 498A FIR at Jodhpur..." }), false);
    assert.equal(isSampleMatter({ title: SAMPLE_TITLES[2] }), true);
    assert.equal(isSampleMatter({ caseNumber: "Bail 88/2026" }), true);
    assert.equal(isSampleMatter({ title: "Other", caseNumber: "CS 1/2026" }), false);
  });
});
