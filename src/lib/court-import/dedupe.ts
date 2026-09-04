import { contentHash } from "./hash.ts";
import type { NormalizedOrder } from "./types.ts";

export type ExistingRecord = {
  externalId?: string | null;
  contentHash?: string | null;
  orderDate?: string | null;
  title?: string | null;
};

export function orderHash(order: NormalizedOrder): string {
  if (order.body.trim()) return contentHash(order.body);
  return contentHash(order.externalId, order.orderDate, order.title);
}

export function isDuplicateOrder(order: NormalizedOrder, existing: ExistingRecord[]): boolean {
  const hash = orderHash(order);
  const ext = (order.externalId || "").trim().toLowerCase();
  const date = order.orderDate || "";
  const title = (order.title || "").trim().toLowerCase();
  return existing.some((row) => {
    if (hash && row.contentHash && row.contentHash === hash) return true;
    if (ext && row.externalId && row.externalId.trim().toLowerCase() === ext) return true;
    if (date && title && row.orderDate === date && (row.title || "").trim().toLowerCase() === title) return true;
    return false;
  });
}

export function partitionOrders(orders: NormalizedOrder[], existing: ExistingRecord[]) {
  const imported: NormalizedOrder[] = [];
  const duplicates: NormalizedOrder[] = [];
  const failed: NormalizedOrder[] = [];
  const seenThisRun = new Set<string>();
  for (const order of orders) {
    const hash = orderHash(order);
    if (seenThisRun.has(hash) || seenThisRun.has(order.externalId)) {
      duplicates.push(order);
      continue;
    }
    if (!order.available || (!order.body.trim() && !order.title)) {
      failed.push(order);
      continue;
    }
    if (isDuplicateOrder(order, existing)) {
      duplicates.push(order);
      continue;
    }
    seenThisRun.add(hash);
    if (order.externalId) seenThisRun.add(order.externalId);
    imported.push(order);
  }
  return { imported, duplicates, failed };
}
