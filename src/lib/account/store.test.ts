import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ACCOUNT_USER_ID_TABLES } from "./store.ts";

describe("delete my account tables", () => {
  it("drops matter children before matters", () => {
    const order = [...ACCOUNT_USER_ID_TABLES];
    assert.ok(order.indexOf("hearings") < order.indexOf("matters"));
    assert.ok(order.indexOf("matter_documents") < order.indexOf("matters"));
    assert.ok(order.indexOf("matter_orders") < order.indexOf("matters"));
    assert.ok(order.indexOf("tasks") < order.indexOf("matters"));
    assert.ok(order.indexOf("deadlines") < order.indexOf("matters"));
    assert.ok(order.indexOf("timeline_events") < order.indexOf("matters"));
  });

  it("covers chamber data and does not target auth user by name", () => {
    assert.equal(ACCOUNT_USER_ID_TABLES.includes("user" as never), false);
    assert.ok(ACCOUNT_USER_ID_TABLES.includes("entitlements"));
    assert.ok(ACCOUNT_USER_ID_TABLES.includes("memos"));
  });
});
