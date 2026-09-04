import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseTrialCnrFetches, parseTrialDays } from "./limits.ts";
import { computeSnapshot, unstartedSnapshot, type EntitlementRow } from "./plan.ts";

function row(patch: Partial<EntitlementRow> = {}): EntitlementRow {
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

describe("trial defaults", () => {
  it("parses days and CNR caps with a sane floor and ceiling", () => {
    assert.equal(parseTrialDays("30"), 30);
    assert.equal(parseTrialDays("1"), 1);
    assert.equal(parseTrialDays("0"), 30);
    assert.equal(parseTrialDays("9999"), 365);
    assert.equal(parseTrialCnrFetches("10"), 10);
    assert.equal(parseTrialCnrFetches("0"), 0);
    assert.equal(parseTrialCnrFetches("-3"), 10);
    assert.equal(parseTrialCnrFetches("5000"), 1000);
  });
});

describe("trial ends on time or live CNR fetches", () => {
  it("keeps the trial open with days and fetches left", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const snap = computeSnapshot(row({ cnr_fetches_used: 2 }), now, { trialDays: 30, trialCnrFetches: 10 });
    assert.equal(snap.status, "trial");
    assert.equal(snap.canUseAi, true);
    assert.equal(snap.canFetchCnr, true);
    assert.equal(snap.cnrFetchesLeft, 8);
  });

  it("ends the trial when live CNR fetches are used up, even with days left", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const snap = computeSnapshot(row({ cnr_fetches_used: 10 }), now, { trialDays: 30, trialCnrFetches: 10 });
    assert.equal(snap.status, "expired");
    assert.equal(snap.canUseAi, false);
    assert.equal(snap.canFetchCnr, false);
    assert.equal(snap.cnrFetchesLeft, 0);
  });

  it("honours a per-user CNR cap over the chamber default", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const snap = computeSnapshot(row({ cnr_fetches_used: 3, cnr_fetch_limit: 3 }), now, {
      trialDays: 30,
      trialCnrFetches: 10,
    });
    assert.equal(snap.cnrFetchLimit, 3);
    assert.equal(snap.canFetchCnr, false);
    assert.equal(snap.status, "expired");
  });

  it("does not cap paid chambers", () => {
    const now = new Date("2026-09-10T00:00:00.000Z");
    const snap = computeSnapshot(
      row({
        status: "active",
        subscribed_at: "2026-08-31T00:00:00.000Z",
        period_end: "2026-09-30T00:00:00.000Z",
        cnr_fetches_used: 99,
      }),
      now,
      { trialDays: 30, trialCnrFetches: 10 },
    );
    assert.equal(snap.status, "active");
    assert.equal(snap.canFetchCnr, true);
    assert.equal(snap.cnrFetchesLeft, null);
  });

  it("unstarted trial uses chamber defaults", () => {
    const now = new Date("2026-08-30T12:00:00.000Z");
    const snap = unstartedSnapshot(now, { trialDays: 30, trialCnrFetches: 10 });
    assert.equal(snap.trialStarted, false);
    assert.equal(snap.cnrFetchesLeft, 10);
    assert.equal(snap.daysLeft, 30);
  });
});
