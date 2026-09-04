import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDuplicateOrder, orderHash, partitionOrders } from "./dedupe.ts";
import { DISTRICT_FIXTURE } from "./fixtures.ts";

describe("document deduplication", () => {
  it("treats the same body as a duplicate", () => {
    const order = DISTRICT_FIXTURE.orders.find((o) => o.available)!;
    const hash = orderHash(order);
    assert.equal(isDuplicateOrder(order, [{ contentHash: hash }]), true);
    assert.equal(isDuplicateOrder(order, [{ externalId: order.externalId }]), true);
    assert.equal(isDuplicateOrder(order, []), false);
  });

  it("is idempotent across a second fetch of the same fixture", () => {
    const first = partitionOrders(DISTRICT_FIXTURE.orders, []);
    assert.ok(first.imported.length >= 5);
    assert.equal(first.failed.length, 1);
    const existing = first.imported.map((o) => ({
      externalId: o.externalId,
      contentHash: orderHash(o),
      orderDate: o.orderDate,
      title: o.title,
    }));
    const second = partitionOrders(DISTRICT_FIXTURE.orders, existing);
    assert.equal(second.imported.length, 0);
    assert.ok(second.duplicates.length >= 5);
    assert.equal(second.failed.length, 1);
  });

  it("keeps a partial failure from wiping successful records", () => {
    const { imported, failed } = partitionOrders(DISTRICT_FIXTURE.orders, []);
    assert.ok(imported.length > 0);
    assert.ok(failed.some((o) => /broken link/i.test(o.error ?? "")));
  });
});
