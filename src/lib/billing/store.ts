import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  PLAN_ID,
  TRIAL_DAYS,
  addDays,
  computeSnapshot,
  unstartedSnapshot,
  type BillingSnapshot,
  type EntitlementRow,
} from "./plan";

function mapRow(row: Record<string, unknown>): EntitlementRow {
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
  };
}

async function fetchRow(userId: string): Promise<EntitlementRow | null> {
  const sql = await getSql();
  const rows = await sql`select * from entitlements where user_id = ${userId} limit 1`;
  if (!rows[0]) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

async function ensureTrial(userId: string): Promise<EntitlementRow> {
  const sql = await getSql();
  await sql`
    insert into entitlements (user_id, status, plan, trial_started_at, trial_ends_at)
    values (${userId}, 'trial', ${PLAN_ID}, now(), now() + interval '30 days')
    on conflict (user_id) do nothing
  `;
  const row = await fetchRow(userId);
  if (!row) throw new Error("entitlement missing");
  return row;
}

export async function readSnapshot(userId: string): Promise<BillingSnapshot> {
  const row = await fetchRow(userId);
  return row ? computeSnapshot(row) : unstartedSnapshot();
}

export async function gateAi(
  userId: string,
  opts?: { demo?: boolean },
): Promise<{ ok: true } | { ok: false; error: "PAYWALL" }> {
  if (opts?.demo) return { ok: true };
  const row = await ensureTrial(userId);
  const snap = computeSnapshot(row);
  if (!snap.canUseAi) return { ok: false, error: "PAYWALL" };
  return { ok: true };
}

export const getEntitlement = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    return readSnapshot(context.userId);
  });

export const startSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const sql = await getSql();
    const row = await ensureTrial(context.userId);
    const now = new Date();
    const trialEnd = new Date(row.trial_ends_at);
    const from = trialEnd.getTime() > now.getTime() ? trialEnd : now;
    const periodEnd = addDays(from, TRIAL_DAYS).toISOString();
    await sql`
      update entitlements
      set status = 'active',
          subscribed_at = coalesce(subscribed_at, now()),
          period_end = ${periodEnd},
          cancelled_at = null,
          updated_at = now()
      where user_id = ${context.userId}
    `;
    return readSnapshot(context.userId);
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const sql = await getSql();
    await sql`
      update entitlements
      set status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      where user_id = ${context.userId}
        and status = 'active'
    `;
    return readSnapshot(context.userId);
  });
