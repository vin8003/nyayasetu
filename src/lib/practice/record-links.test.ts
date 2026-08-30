import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSampleChamber } from "./sample.ts";
import { findInBundle, relatedIdForEvent, nextHearingId } from "./record-links.ts";
import type { MatterBundle } from "./types.ts";

function asBundle(): MatterBundle {
  const pack = buildSampleChamber();
  const matter = pack.matters[0];
  return {
    matter: { ...matter, clientName: "Vikram Sharma", createdAt: "", updatedAt: "" },
    hearings: pack.hearings.filter((h) => h.matterId === matter.id) as MatterBundle["hearings"],
    documents: (pack.documents ?? [])
      .filter((d) => d.matterId === matter.id)
      .map((d) => ({
        id: d.id,
        matterId: d.matterId,
        kind: d.kind,
        title: d.title,
        text: d.body,
        sourceKind: d.sourceKind ?? "paste",
        createdAt: "",
      })),
    orders: (pack.orders ?? [])
      .filter((o) => o.matterId === matter.id)
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
    tasks: pack.tasks.filter((t) => t.matterId === matter.id) as MatterBundle["tasks"],
    deadlines: pack.deadlines.filter((d) => d.matterId === matter.id) as MatterBundle["deadlines"],
    timeline: pack.events
      .filter((e) => e.matterId === matter.id)
      .map((e) => ({
        id: e.id,
        matterId: e.matterId,
        happenedOn: e.happenedOn,
        kind: e.kind,
        title: e.title,
        detail: e.detail,
        origin: e.origin,
        refId: e.refId ?? null,
        createdAt: "",
      })),
  };
}

describe("matter record links", () => {
  it("resolves sample papers, orders and timeline refs", () => {
    const bundle = asBundle();
    assert.ok(bundle.documents.length >= 2);
    assert.ok(bundle.orders.length >= 1);
    const notice = bundle.documents.find((d) => /legal notice/i.test(d.title));
    assert.ok(notice);
    assert.equal(findInBundle(bundle, notice!.id)?.kind, "document");
    const noticeEvent = bundle.timeline.find((e) => /legal notice/i.test(e.title));
    assert.ok(noticeEvent?.refId);
    assert.equal(relatedIdForEvent(noticeEvent!, bundle), notice!.id);
    assert.equal(findInBundle(bundle, nextHearingId(bundle)!)?.kind, "hearing");
    assert.equal(findInBundle(bundle, "file")?.kind, "file");
    assert.equal(findInBundle(bundle, "notes")?.kind, "notes");
  });
});
