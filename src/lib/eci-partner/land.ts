import { partitionOrders, type ExistingRecord } from "../court-import/dedupe.ts";
import type { NormalizedOrder } from "../court-import/types.ts";
import { emptyParseStatus as failEmptyStatus } from "./fail.ts";
import { hasLandableBody } from "./parse.ts";
import type { InboxLandPlan } from "./types.ts";

export function planInboxLand(orders: NormalizedOrder[], existing: ExistingRecord[]): InboxLandPlan {
  const { imported, duplicates, failed } = partitionOrders(orders, existing);
  const items = [
    ...imported.map((order) => ({ action: "land" as const, order, confirmed: false as const })),
    ...duplicates.map((order) => ({ action: "duplicate" as const, order, confirmed: false as const })),
    ...failed.map((order) => ({ action: "failed" as const, order, confirmed: false as const })),
  ];
  return {
    empty: !hasLandableBody(orders) && duplicates.length === 0,
    toLand: imported,
    duplicates,
    failed,
    items,
  };
}

export function emptyParseStatus(plan: InboxLandPlan): "needs_human" | null {
  return failEmptyStatus(plan);
}
