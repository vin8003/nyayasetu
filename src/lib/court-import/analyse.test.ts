import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChronologyUser, quoteIfVerbatim } from "./analyse.ts";
import type { ExtractedEvent, NormalizedOrder } from "./types.ts";

describe("quoteIfVerbatim", () => {
  const sources = ["list the matter on 12.03.2026. the defendant shall file the written statement within four weeks."];

  it("keeps a quote that is in an order, ignoring case, spacing and wrapping quotes", () => {
    assert.equal(
      quoteIfVerbatim("“The Defendant shall file  the written statement”", sources),
      "The Defendant shall file  the written statement",
    );
  });

  it("drops a paraphrase posing as a quote", () => {
    assert.equal(quoteIfVerbatim("Defendant directed to file WS in 4 weeks", sources), "");
  });
});

describe("buildChronologyUser", () => {
  it("lists known events so the model only adds missing ones, and keeps more of each order", () => {
    const body = "x".repeat(2500);
    const orders = [{ title: "Order", orderDate: "2026-01-05", body, available: true }] as unknown as NormalizedOrder[];
    const existing = [{ happenedOn: "2026-01-05", title: "Notice issued" }] as ExtractedEvent[];
    const user = buildChronologyUser(orders, existing, new Date("2026-02-01T00:00:00Z"));
    assert.match(user, /Known events \(do not repeat\):\n- 2026-01-05 Notice issued/);
    assert.ok(user.includes(body));
    assert.match(user, /2026-02-01/);
  });
});
