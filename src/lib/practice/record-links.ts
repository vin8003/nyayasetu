import type { MatterBundle, TimelineEvent } from "./types.ts";

export type RecordKind = "hearing" | "document" | "order" | "task" | "deadline" | "event" | "notes";

export type LocatedRecord = { kind: RecordKind; id: string };

export function findInBundle(bundle: MatterBundle, id: string | null | undefined): LocatedRecord | null {
  if (!id) return null;
  if (id === "notes") return { kind: "notes", id: "notes" };
  if (id === "hearings" || id === "documents" || id === "orders" || id === "tasks" || id === "deadlines" || id === "timeline") {
    return null;
  }
  if (bundle.hearings.some((h) => h.id === id)) return { kind: "hearing", id };
  if (bundle.documents.some((d) => d.id === id)) return { kind: "document", id };
  if (bundle.orders.some((o) => o.id === id)) return { kind: "order", id };
  if (bundle.tasks.some((t) => t.id === id)) return { kind: "task", id };
  if (bundle.deadlines.some((d) => d.id === id)) return { kind: "deadline", id };
  if (bundle.timeline.some((e) => e.id === id)) return { kind: "event", id };
  return null;
}

function overlaps(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const token = y.split(/\s+/).filter((t) => t.length >= 5)[0];
  return token ? x.includes(token) : false;
}

export function relatedIdForEvent(event: TimelineEvent, bundle: MatterBundle): string | null {
  if (event.refId && findInBundle(bundle, event.refId)) return event.refId;
  const kind = (event.kind || "").toLowerCase();
  if (kind === "order") {
    return (
      bundle.orders.find((o) => o.orderDate === event.happenedOn)?.id ??
      bundle.orders[0]?.id ??
      null
    );
  }
  if (kind === "document" || kind === "filing") {
    return (
      bundle.documents.find((d) => overlaps(d.title, event.title) || overlaps(event.detail ?? "", d.title))?.id ??
      bundle.documents[0]?.id ??
      null
    );
  }
  if (kind === "hearing" || kind === "stage") {
    return bundle.hearings.find((h) => h.listedOn === event.happenedOn)?.id ?? null;
  }
  return null;
}

export function nextHearingId(bundle: MatterBundle): string | null {
  const date = bundle.matter.nextHearingOn;
  if (!date) return bundle.hearings[0]?.id ?? "hearings";
  return bundle.hearings.find((h) => h.listedOn === date)?.id ?? bundle.hearings[0]?.id ?? "hearings";
}

export function lastOrderId(bundle: MatterBundle): string | null {
  return bundle.orders[0]?.id ?? "orders";
}

export function sectionFor(kind: RecordKind | string): string {
  if (kind === "hearing") return "hearings";
  if (kind === "document") return "documents";
  if (kind === "order") return "orders";
  if (kind === "task") return "tasks";
  if (kind === "deadline") return "deadlines";
  if (kind === "event") return "timeline";
  if (kind === "notes") return "notes";
  return kind;
}
