import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, computeSnapshot, unstartedSnapshot, type EntitlementRow } from "./plan.ts";

function row(patch: Partial<EntitlementRow>): EntitlementRow {
  return {
    user_id: "u1",
    status: "trial",
    plan: "chamber_monthly",
    trial_started_at: "2026-08-01T00:00:00.000Z",
    trial_ends_at: "2026-08-31T00:00:00.000Z",
    subscribed_at: null,
    period_end: null,
    cancelled_at: null,
    updated_at: "2026-08-01T00:00:00.000Z",
    razorpay_customer_id: null,
    razorpay_subscription_id: null,
    cnr_fetches_used: 0,
    cnr_fetch_limit: null,
    ...patch,
  };
}

describe("billing snapshot", () => {
  it("keeps AI open during the 30-day trial", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const snap = computeSnapshot(row({}), now);
    assert.equal(snap.status, "trial");
    assert.equal(snap.canUseAi, true);
    assert.equal(snap.daysLeft, 21);
    assert.equal(snap.trialStarted, true);
    assert.equal(snap.paymentsLive, false);
    assert.equal(snap.canFetchCnr, true);
    assert.equal(snap.cnrFetchesLeft, 10);
  });

  it("closes AI when the trial lapses without a subscription", () => {
    const now = new Date("2026-09-01T00:00:01.000Z");
    const snap = computeSnapshot(row({}), now);
    assert.equal(snap.status, "expired");
    assert.equal(snap.canUseAi, false);
    assert.equal(snap.daysLeft, 0);
  });

  it("keeps a paid chamber open until period_end", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const snap = computeSnapshot(
      row({
        status: "active",
        subscribed_at: "2026-08-31T00:00:00.000Z",
        period_end: "2026-09-30T00:00:00.000Z",
      }),
      now,
    );
    assert.equal(snap.status, "active");
    assert.equal(snap.canUseAi, true);
    assert.equal(snap.daysLeft, 20);
  });

  it("lets a cancelled plan run until the paid period ends", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const snap = computeSnapshot(
      row({
        status: "cancelled",
        period_end: "2026-09-20T00:00:00.000Z",
        cancelled_at: "2026-09-05T00:00:00.000Z",
      }),
      now,
    );
    assert.equal(snap.status, "cancelled");
    assert.equal(snap.canUseAi, true);
  });

  it("addDays is used for a 30-day paid window", () => {
    const start = new Date("2026-08-30T00:00:00.000Z");
    assert.equal(addDays(start, 30).toISOString(), "2026-09-29T00:00:00.000Z");
  });

  it("keeps the clock unstarted until own-matter research", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    const snap = unstartedSnapshot(now);
    assert.equal(snap.trialStarted, false);
    assert.equal(snap.canUseAi, true);
    assert.equal(snap.daysLeft, 30);
    assert.equal(snap.status, "trial");
    assert.equal(snap.paymentsLive, false);
  });
});
