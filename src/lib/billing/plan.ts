import type { TrialDefaults } from "./limits.ts";

export const DEFAULT_TRIAL_DAYS = 30;
export const DEFAULT_TRIAL_CNR_FETCHES = 10;
export const TRIAL_DAYS = DEFAULT_TRIAL_DAYS;

export const PLAN_ID = "chamber_monthly" as const;
export const PLAN_PRICE_INR = 500;
export const MIN_ORDER_PAISE = 100;
export const CHAMBER_AMOUNT_PAISE = PLAN_PRICE_INR * 100;
export const CHAMBER_CURRENCY = "INR";

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
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  cnr_fetches_used: number;
  /** Null = use the chamber default. */
  cnr_fetch_limit: number | null;
};

export type BillingSnapshot = {
  status: EntitlementStatus;
  canUseAi: boolean;
  /** Live CNR fetch is allowed on paid plans, or on trial with fetches left. */
  canFetchCnr: boolean;
  trialEndsAt: string;
  periodEnd: string | null;
  daysLeft: number;
  plan: typeof PLAN_ID;
  priceInr: number;
  /** False until the user researches their own (non-sample) matter. */
  trialStarted: boolean;
  /** True when Razorpay keys are set — Subscribe opens Checkout instead of a free toggle. */
  paymentsLive: boolean;
  cnrFetchesUsed: number;
  cnrFetchLimit: number;
  /** Null on a paid chamber (unlimited). */
  cnrFetchesLeft: number | null;
};

const DAY_MS = 86_400_000;

function asInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function mapEntitlementRow(row: Record<string, unknown>): EntitlementRow {
  const str = (key: string) => {
    const v = row[key];
    if (v == null) return null;
    if (v instanceof Date) return v.toISOString();
    return String(v);
  };
  return {
    user_id: String(row.user_id),
    status: String(row.status ?? "trial"),
    plan: String(row.plan ?? PLAN_ID),
    trial_started_at: str("trial_started_at") ?? new Date().toISOString(),
    trial_ends_at: str("trial_ends_at") ?? new Date().toISOString(),
    subscribed_at: str("subscribed_at"),
    period_end: str("period_end"),
    cancelled_at: str("cancelled_at"),
    updated_at: str("updated_at") ?? new Date().toISOString(),
    razorpay_customer_id: str("razorpay_customer_id"),
    razorpay_subscription_id: str("razorpay_subscription_id"),
    cnr_fetches_used: Math.max(0, asInt(row.cnr_fetches_used, 0)),
    cnr_fetch_limit: row.cnr_fetch_limit == null || row.cnr_fetch_limit === "" ? null : Math.max(0, asInt(row.cnr_fetch_limit, 0)),
  };
}

export function daysLeft(end: Date, now: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

export function effectiveCnrLimit(row: Pick<EntitlementRow, "cnr_fetch_limit">, defaults?: TrialDefaults): number {
  if (row.cnr_fetch_limit != null && Number.isFinite(row.cnr_fetch_limit)) {
    return Math.max(0, row.cnr_fetch_limit);
  }
  return defaults?.trialCnrFetches ?? DEFAULT_TRIAL_CNR_FETCHES;
}

export function computeSnapshot(
  row: EntitlementRow,
  now = new Date(),
  defaults?: TrialDefaults,
): BillingSnapshot {
  const trialEnd = new Date(row.trial_ends_at);
  const periodEnd = row.period_end ? new Date(row.period_end) : null;
  const paid =
    (row.status === "active" || row.status === "cancelled") &&
    periodEnd != null &&
    periodEnd.getTime() > now.getTime();
  const limit = effectiveCnrLimit(row, defaults);
  const used = Math.max(0, row.cnr_fetches_used || 0);
  const fetchesLeft = Math.max(0, limit - used);
  const timeOk = trialEnd.getTime() > now.getTime();
  const fetchOk = fetchesLeft > 0;
  const trial = !paid && timeOk && fetchOk;
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
    canFetchCnr: paid || (timeOk && fetchOk),
    trialEndsAt: trialEnd.toISOString(),
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
    daysLeft: daysLeft(end, now),
    plan: PLAN_ID,
    priceInr: PLAN_PRICE_INR,
    trialStarted: true,
    paymentsLive: false,
    cnrFetchesUsed: used,
    cnrFetchLimit: limit,
    cnrFetchesLeft: paid ? null : fetchesLeft,
  };
}

/** Sample chamber does not insert an entitlement. Clock starts on first own-matter AI use. */
export function unstartedSnapshot(now = new Date(), defaults?: TrialDefaults): BillingSnapshot {
  const days = defaults?.trialDays ?? DEFAULT_TRIAL_DAYS;
  const limit = defaults?.trialCnrFetches ?? DEFAULT_TRIAL_CNR_FETCHES;
  return {
    status: "trial",
    canUseAi: true,
    canFetchCnr: limit > 0,
    trialEndsAt: addDays(now, days).toISOString(),
    periodEnd: null,
    daysLeft: days,
    plan: PLAN_ID,
    priceInr: PLAN_PRICE_INR,
    trialStarted: false,
    paymentsLive: false,
    cnrFetchesUsed: 0,
    cnrFetchLimit: limit,
    cnrFetchesLeft: limit,
  };
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

/** Razorpay orders are integer paise. Below 100 is rejected. */
export function parseOrderAmount(raw: unknown): number {
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount < MIN_ORDER_PAISE) {
    throw new Error("Amount must be at least 100 paise.");
  }
  return Math.round(amount);
}

/** Razorpay `current_end` is unix seconds. Missing value → now + trial days. */
export function periodEndIso(currentEnd: unknown, now = new Date(), days = TRIAL_DAYS): string {
  if (typeof currentEnd === "number" && Number.isFinite(currentEnd) && currentEnd > 0) {
    return new Date(currentEnd * 1000).toISOString();
  }
  return addDays(now, days).toISOString();
}
