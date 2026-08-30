export const TRIAL_DAYS = 30;
export const PLAN_ID = "chamber_monthly" as const;
export const PLAN_PRICE_INR = 500;

export type EntitlementStatus = "trial" | "active" | "cancelled" | "expired";

export type EntitlementRow = {
  user_id: string;
  status: string;
  plan: string;
  trial_started_at: string;
  trial_ends_at: string;
  subscribed_at: string | null;
  period_end: string | null;
  cancelled_at: string | null;
  updated_at: string;
};

export type BillingSnapshot = {
  status: EntitlementStatus;
  canUseAi: boolean;
  trialEndsAt: string;
  periodEnd: string | null;
  daysLeft: number;
  plan: typeof PLAN_ID;
  priceInr: number;
  /** False until the user researches their own (non-sample) matter. */
  trialStarted: boolean;
};

const DAY_MS = 86_400_000;

export function daysLeft(end: Date, now: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

export function computeSnapshot(row: EntitlementRow, now = new Date()): BillingSnapshot {
  const trialEnd = new Date(row.trial_ends_at);
  const periodEnd = row.period_end ? new Date(row.period_end) : null;
  const paid =
    (row.status === "active" || row.status === "cancelled") &&
    periodEnd != null &&
    periodEnd.getTime() > now.getTime();
  const trial = !paid && trialEnd.getTime() > now.getTime();
  const canUseAi = paid || trial;
  let status: EntitlementStatus;
  if (paid && row.status === "cancelled") status = "cancelled";
  else if (paid) status = "active";
  else if (trial) status = "trial";
  else status = "expired";
  const end = paid && periodEnd ? periodEnd : trialEnd;
  return {
    status,
    canUseAi,
    trialEndsAt: trialEnd.toISOString(),
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
    daysLeft: daysLeft(end, now),
    plan: PLAN_ID,
    priceInr: PLAN_PRICE_INR,
    trialStarted: true,
  };
}

/** Sample chamber does not insert an entitlement. Clock starts on first own-matter AI use. */
export function unstartedSnapshot(now = new Date()): BillingSnapshot {
  return {
    status: "trial",
    canUseAi: true,
    trialEndsAt: addDays(now, TRIAL_DAYS).toISOString(),
    periodEnd: null,
    daysLeft: TRIAL_DAYS,
    plan: PLAN_ID,
    priceInr: PLAN_PRICE_INR,
    trialStarted: false,
  };
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}
