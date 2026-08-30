import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CHAMBER_AMOUNT_PAISE, MIN_ORDER_PAISE, parseOrderAmount } from "./plan.ts";

describe("create-order amount", () => {
  it("accepts the chamber price and rejects below 100 paise", () => {
    assert.equal(parseOrderAmount(CHAMBER_AMOUNT_PAISE), 50000);
    assert.equal(parseOrderAmount("50000"), 50000);
    assert.equal(MIN_ORDER_PAISE, 100);
    assert.throws(() => parseOrderAmount(99), /100 paise/);
    assert.throws(() => parseOrderAmount("nope"), /100 paise/);
  });
});
