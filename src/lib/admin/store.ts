import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { paymentsLive } from "@/lib/billing/live";
import {
  PLAN_ID,
  addDays,
  computeSnapshot,
  mapEntitlementRow,
  unstartedSnapshot,
  type BillingSnapshot,
  type EntitlementRow,
} from "@/lib/billing/plan";
import type { TrialDefaults } from "@/lib/billing/limits";
import { purgeUserAccount } from "@/lib/account/store";

async function countOrZero(query: Promise<{ n: number }[]>): Promise<number> {
  try {
    const rows = await query;
    return rows[0]?.n ?? 0;
  } catch {
    return 0;
  }
}

async function loadUser(userId: string): Promise<AdminUserRow> {
  const sql = await getSql();
  const users = await sql<Record<string, unknown>>`
    select id, name, email, "createdAt" from "user" where id = ${userId} limit 1
  `;
  if (!users[0]) throw new Error("User not found.");
  const ents = await sql<Record<string, unknown>>`
    select * from entitlements where user_id = ${userId} limit 1
  `;
  const raw = users[0];
  const created = raw.createdAt;
  const [matters, memos] = await Promise.all([
    countOrZero(sql<{ n: number }>`select count(*)::int as n from matters where user_id = ${userId}`),
    countOrZero(sql<{ n: number }>`select count(*)::int as n from memos where user_id = ${userId}`),
  ]);
  const { readTrialDefaults } = await import("@/lib/billing/settings.server");
  const defaults = await readTrialDefaults();
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    createdAt: created instanceof Date ? created.toISOString() : String(created ?? ""),
    snap: snapshotOf(mapEntitlement(ents[0] ?? null), defaults),
    razorpayId: ents[0]?.razorpay_subscription_id
      ? String(ents[0].razorpay_subscription_id)
      : null,
    matters,
    memos,
  };
}

function mapEntitlement(row: Record<string, unknown> | null): EntitlementRow | null {
  if (!row) return null;
  return mapEntitlementRow(row);
}

function snapshotOf(row: EntitlementRow | null, defaults?: TrialDefaults): BillingSnapshot {
  if (!row) return { ...unstartedSnapshot(new Date(), defaults), paymentsLive: paymentsLive() };
  return { ...computeSnapshot(row, new Date(), defaults), paymentsLive: paymentsLive() };
}

export type AdminStats = {
  users: number;
  users7d: number;
  users30d: number;
  trial: number;
  active: number;
  cancelled: number;
  expired: number;
  paid: number;
  dummy: number;
  matters: number;
  memos: number;
  paymentsLive: boolean;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  snap: BillingSnapshot;
  razorpayId: string | null;
  matters?: number;
  memos?: number;
};

export const adminSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; email: string; userId: string }> => {
    const { requireAdmin } = await import("./guard.server");
    const admin = await requireAdmin(context.userId);
    return { ok: true, email: admin.email, userId: admin.id };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminStats> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    const sql = await getSql();
    const users = await sql<{ n: number }>`select count(*)::int as n from "user"`;
    const users7d = await sql<{ n: number }>`
      select count(*)::int as n from "user" where "createdAt" > now() - interval '7 days'
    `;
    const users30d = await sql<{ n: number }>`
      select count(*)::int as n from "user" where "createdAt" > now() - interval '30 days'
    `;
    const { readTrialDefaults } = await import("@/lib/billing/settings.server");
    const defaults = await readTrialDefaults();
    const rows = await sql<Record<string, unknown>>`select * from entitlements`;
    let trial = 0;
    let active = 0;
    let cancelled = 0;
    let expired = 0;
    let paid = 0;
    let dummy = 0;
    for (const raw of rows) {
      const ent = mapEntitlement(raw);
      if (!ent) continue;
      const snap = computeSnapshot(ent, new Date(), defaults);
      if (snap.status === "trial") trial += 1;
      else if (snap.status === "active") active += 1;
      else if (snap.status === "cancelled") cancelled += 1;
      else expired += 1;
      if (ent.razorpay_subscription_id) paid += 1;
      else if (snap.status === "active" || snap.status === "cancelled") dummy += 1;
    }
    let matters = 0;
    let memos = 0;
    try {
      const m = await sql<{ n: number }>`select count(*)::int as n from matters`;
      matters = m[0]?.n ?? 0;
    } catch {
      matters = 0;
    }
    try {
      const m = await sql<{ n: number }>`select count(*)::int as n from memos`;
      memos = m[0]?.n ?? 0;
    } catch {
      memos = 0;
    }
    return {
      users: users[0]?.n ?? 0,
      users7d: users7d[0]?.n ?? 0,
      users30d: users30d[0]?.n ?? 0,
      trial,
      active,
      cancelled,
      expired,
      paid,
      dummy,
      matters,
      memos,
      paymentsLive: paymentsLive(),
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { q?: string }) => ({ q: String(input?.q ?? "").trim().slice(0, 80) }))
  .handler(async ({ context, data }): Promise<AdminUserRow[]> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    const sql = await getSql();
    const q = data.q.toLowerCase();
    const rows = q
      ? await sql<Record<string, unknown>>`
          select u.id, u.name, u.email, u."createdAt",
                 e.status as ent_status, e.plan, e.trial_started_at, e.trial_ends_at,
                 e.subscribed_at, e.period_end, e.cancelled_at, e.updated_at,
                 e.razorpay_customer_id, e.razorpay_subscription_id, e.user_id,
                 e.cnr_fetches_used, e.cnr_fetch_limit
          from "user" u
          left join entitlements e on e.user_id = u.id
          where lower(u.email) like ${"%" + q + "%"}
             or lower(u.name) like ${"%" + q + "%"}
          order by u."createdAt" desc
          limit 200
        `
      : await sql<Record<string, unknown>>`
          select u.id, u.name, u.email, u."createdAt",
                 e.status as ent_status, e.plan, e.trial_started_at, e.trial_ends_at,
                 e.subscribed_at, e.period_end, e.cancelled_at, e.updated_at,
                 e.razorpay_customer_id, e.razorpay_subscription_id, e.user_id,
                 e.cnr_fetches_used, e.cnr_fetch_limit
          from "user" u
          left join entitlements e on e.user_id = u.id
          order by u."createdAt" desc
          limit 200
        `;
    const { readTrialDefaults } = await import("@/lib/billing/settings.server");
    const defaults = await readTrialDefaults();
    return rows.map((raw) => {
      const created = raw.createdAt;
      const createdAt =
        created instanceof Date ? created.toISOString() : String(created ?? "");
      const ent = raw.user_id
        ? mapEntitlement({
            ...raw,
            status: raw.ent_status,
          })
        : null;
      return {
        id: String(raw.id),
        name: String(raw.name ?? ""),
        email: String(raw.email ?? ""),
        createdAt,
        snap: snapshotOf(ent, defaults),
        razorpayId: raw.razorpay_subscription_id ? String(raw.razorpay_subscription_id) : null,
      };
    });
  });

export const getAdminUser = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string }) => ({ userId: String(input?.userId ?? "").trim() }))
  .handler(async ({ context, data }): Promise<AdminUserRow> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    if (!data.userId) throw new Error("Missing user.");
    return loadUser(data.userId);
  });

export type AdminPlanAction = "grant30" | "cancel" | "expire" | "trial";

export const updateAdminPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string; action?: string }) => ({
    userId: String(input?.userId ?? "").trim(),
    action: String(input?.action ?? "").trim() as AdminPlanAction,
  }))
  .handler(async ({ context, data }): Promise<AdminUserRow> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    if (!data.userId) throw new Error("Missing user.");
    if (!["grant30", "cancel", "expire", "trial"].includes(data.action)) {
      throw new Error("Unknown action.");
    }
    const sql = await getSql();
    const { readTrialDefaults } = await import("@/lib/billing/settings.server");
    const defaults = await readTrialDefaults();
    const trialEnd = addDays(new Date(), defaults.trialDays).toISOString();
    await sql`
      insert into entitlements (user_id, status, plan, trial_started_at, trial_ends_at)
      values (${data.userId}, 'trial', ${PLAN_ID}, now(), ${trialEnd})
      on conflict (user_id) do nothing
    `;
    if (data.action === "grant30") {
      await sql`
        update entitlements
        set status = 'active',
            subscribed_at = coalesce(subscribed_at, now()),
            period_end = case
              when period_end is not null and period_end > now()
                then period_end + interval '30 days'
              else now() + interval '30 days'
            end,
            cancelled_at = null,
            updated_at = now()
        where user_id = ${data.userId}
      `;
    } else if (data.action === "cancel") {
      await sql`
        update entitlements
        set status = 'cancelled',
            cancelled_at = coalesce(cancelled_at, now()),
            updated_at = now()
        where user_id = ${data.userId}
          and status = 'active'
      `;
    } else if (data.action === "expire") {
      await sql`
        update entitlements
        set status = 'cancelled',
            cancelled_at = coalesce(cancelled_at, now()),
            period_end = now(),
            trial_ends_at = least(trial_ends_at, now()),
            updated_at = now()
        where user_id = ${data.userId}
      `;
    } else {
      await sql`
        update entitlements
        set status = 'trial',
            trial_started_at = now(),
            trial_ends_at = ${trialEnd},
            subscribed_at = null,
            period_end = null,
            cancelled_at = null,
            updated_at = now()
        where user_id = ${data.userId}
      `;
    }
    return loadUser(data.userId);
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string }) => ({ userId: String(input?.userId ?? "").trim() }))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./guard.server");
    const admin = await requireAdmin(context.userId);
    if (!data.userId) throw new Error("Missing user.");
    if (data.userId === admin.id) throw new Error("You cannot delete your own admin account.");
    await purgeUserAccount(data.userId);
    return { ok: true };
  });

export const getAdminTrialDefaults = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TrialDefaults> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    const { readTrialDefaults } = await import("@/lib/billing/settings.server");
    return readTrialDefaults();
  });

export const saveAdminTrialDefaults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { trialDays?: number; trialCnrFetches?: number }) => ({
    trialDays: Number(input?.trialDays),
    trialCnrFetches: Number(input?.trialCnrFetches),
  }))
  .handler(async ({ context, data }): Promise<TrialDefaults> => {
    const { requireAdmin } = await import("./guard.server");
    const admin = await requireAdmin(context.userId);
    const { writeTrialDefaults } = await import("@/lib/billing/settings.server");
    return writeTrialDefaults(
      { trialDays: data.trialDays, trialCnrFetches: data.trialCnrFetches },
      admin.id,
    );
  });

export const updateAdminUserLimits = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId?: string; cnrFetchLimit?: number | null; resetFetches?: boolean; extraTrialDays?: number }) => ({
    userId: String(input?.userId ?? "").trim(),
    cnrFetchLimit: input?.cnrFetchLimit === null || input?.cnrFetchLimit === undefined ? null : Number(input.cnrFetchLimit),
    resetFetches: Boolean(input?.resetFetches),
    extraTrialDays:
      input?.extraTrialDays == null || Number.isNaN(Number(input.extraTrialDays))
        ? 0
        : Math.trunc(Number(input.extraTrialDays)),
  }))
  .handler(async ({ context, data }): Promise<AdminUserRow> => {
    const { requireAdmin } = await import("./guard.server");
    await requireAdmin(context.userId);
    if (!data.userId) throw new Error("Missing user.");
    const { readTrialDefaults } = await import("@/lib/billing/settings.server");
    const defaults = await readTrialDefaults();
    const trialEnd = addDays(new Date(), defaults.trialDays).toISOString();
    const sql = await getSql();
    await sql`
      insert into entitlements (user_id, status, plan, trial_started_at, trial_ends_at)
      values (${data.userId}, 'trial', ${PLAN_ID}, now(), ${trialEnd})
      on conflict (user_id) do nothing
    `;
    if (data.resetFetches) {
      await sql`
        update entitlements set cnr_fetches_used = 0, updated_at = now() where user_id = ${data.userId}
      `;
    }
    if (data.cnrFetchLimit === null) {
      await sql`
        update entitlements set cnr_fetch_limit = null, updated_at = now() where user_id = ${data.userId}
      `;
    } else if (Number.isFinite(data.cnrFetchLimit)) {
      const cap = Math.max(0, Math.min(1000, Math.trunc(data.cnrFetchLimit)));
      await sql`
        update entitlements set cnr_fetch_limit = ${cap}, updated_at = now() where user_id = ${data.userId}
      `;
    }
    if (data.extraTrialDays > 0) {
      const extra = Math.min(365, data.extraTrialDays);
      const current = await sql<{ trial_ends_at: string | Date }>`
        select trial_ends_at from entitlements where user_id = ${data.userId} limit 1
      `;
      const rawEnd = current[0]?.trial_ends_at;
      const currentEnd = rawEnd instanceof Date ? rawEnd : new Date(String(rawEnd ?? ""));
      const from = Number.isNaN(currentEnd.getTime()) || currentEnd.getTime() < Date.now() ? new Date() : currentEnd;
      const nextEnd = addDays(from, extra).toISOString();
      await sql`
        update entitlements
        set trial_ends_at = ${nextEnd},
            status = case when status in ('expired', 'cancelled') then 'trial' else status end,
            cancelled_at = case when status in ('expired', 'cancelled') then null else cancelled_at end,
            updated_at = now()
        where user_id = ${data.userId}
      `;
    }
    return loadUser(data.userId);
  });

