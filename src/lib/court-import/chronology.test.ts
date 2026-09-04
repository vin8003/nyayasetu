import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChronology, extractEventsFromOrder } from "./chronology.ts";
import { extractDeadlines } from "./deadlines.ts";
import { DISTRICT_FIXTURE } from "./fixtures.ts";
import { parseIndianDate } from "./dates.ts";

describe("timeline and deadline extraction", () => {
  it("parses Indian dates", () => {
    assert.equal(parseIndianDate("28-01-2025"), "2025-01-28");
    assert.equal(parseIndianDate("28.01.2025"), "2025-01-28");
    assert.equal(parseIndianDate("10th January 2025"), "2025-01-10");
    assert.equal(parseIndianDate("2025-08-12"), "2025-08-12");
  });

  it("builds a chronological history from official-style orders", () => {
    const events = buildChronology(DISTRICT_FIXTURE.orders);
    assert.ok(events.length >= 5);
    const titles = events.map((e) => e.title).join(" | ");
    assert.match(titles, /Notice issued/);
    assert.match(titles, /Written statement/);
    const dates = events.map((e) => e.happenedOn);
    const sorted = [...dates].sort();
    assert.deepEqual(dates, sorted);
    for (const event of events) {
      assert.ok(event.sourceTitle, "every event traces to an order");
      assert.ok(event.quote || event.detail);
      assert.ok(event.verification === "court_imported" || event.verification === "ai_inferred");
    }
  });

  it("extracts an explicit relative deadline from an order", () => {
    const ws = DISTRICT_FIXTURE.orders.find((o) => o.orderDate === "2025-02-18")!;
    const events = extractEventsFromOrder(ws);
    assert.ok(events.some((e) => e.deadline === "2025-03-20"));
    const deadlines = extractDeadlines([ws], events, DISTRICT_FIXTURE.case);
    assert.ok(deadlines.some((d) => d.dueOn === "2025-03-20" && /written statement/i.test(d.title)));
    assert.ok(deadlines.some((d) => d.dueOn === DISTRICT_FIXTURE.case.nextHearingOn));
  });

  it("does not fabricate events when the order has no text", () => {
    const missing = DISTRICT_FIXTURE.orders.find((o) => !o.available)!;
    assert.deepEqual(extractEventsFromOrder(missing), []);
  });
});
