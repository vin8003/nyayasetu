import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  PLAN_ID,
  TRIAL_DAYS,
  addDays,
  computeSnapshot,
  periodEndIso,
  unstartedSnapshot,
  type BillingSnapshot,
  type EntitlementRow,
} from "./plan";
import type { SubscribeResult } from "./types";

export type { SubscribeResult } from "./types";

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
    razorpay_customer_id: str("razorpay_customer_id"),
    razorpay_subscription_id: str("razorpay_subscription_id"),
  };
}

async function fetchRow(userId: string): Promise<EntitlementRow | null> {
  const sql = await getSql();
  const rows = await sql`select * from entitlements where user_id = ${userId} limit 1`;
  if (!rows[0]) return null;
  return mapRow(rows[0] as Record<string, unknown>);
}

async function fetchRowBySubscription(subscriptionId: string): Promise<EntitlementRow | null> {
  const sql = await getSql();
  const rows = await sql`
    select * from entitlements where razorpay_subscription_id = ${subscriptionId} limit 1
  `;
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

async function accountOf(userId: string): Promise<{ name: string; email: string }> {
  const sql = await getSql();
  const rows = await sql<{ name: string | null; email: string | null }>`
    select name, email from "user" where id = ${userId} limit 1
  `;
  return {
    name: rows[0]?.name?.trim() || "Advocate",
    email: rows[0]?.email?.trim() || "",
  };
}

async function markSnapshot(snap: BillingSnapshot): Promise<BillingSnapshot> {
  const { paymentsLive } = await import("./razorpay.server");
  return { ...snap, paymentsLive: paymentsLive() };
}

export async function readSnapshot(userId: string): Promise<BillingSnapshot> {
  const row = await fetchRow(userId);
  const snap = row ? computeSnapshot(row) : unstartedSnapshot();
  return markSnapshot(snap);
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

async function grantPreview(userId: string): Promise<BillingSnapshot> {
  const sql = await getSql();
  await ensureTrial(userId);
  // One month from now — do not stack on leftover trial, or the card reads as two months.
  const periodEnd = addDays(new Date(), TRIAL_DAYS).toISOString();
  await sql`
    update entitlements
    set status = 'active',
        subscribed_at = coalesce(subscribed_at, now()),
        period_end = ${periodEnd},
        cancelled_at = null,
        updated_at = now()
    where user_id = ${userId}
  `;
  return readSnapshot(userId);
}

export async function applyPaidSubscription(opts: {
  userId: string;
  subscriptionId: string;
  customerId?: string | null;
  currentEnd?: unknown;
}): Promise<BillingSnapshot> {
  const sql = await getSql();
  await ensureTrial(opts.userId);
  const periodEnd = periodEndIso(opts.currentEnd);
  const customerId = opts.customerId ?? null;
  await sql`
    update entitlements
    set status = 'active',
        subscribed_at = coalesce(subscribed_at, now()),
        period_end = case
          when period_end is not null and period_end > ${periodEnd}::timestamptz then period_end
          else ${periodEnd}::timestamptz
        end,
        cancelled_at = null,
        razorpay_subscription_id = ${opts.subscriptionId},
        razorpay_customer_id = coalesce(${customerId}, razorpay_customer_id),
        updated_at = now()
    where user_id = ${opts.userId}
  `;
  return readSnapshot(opts.userId);
}

export async function applyCancelledSubscription(userId: string): Promise<BillingSnapshot> {
  const sql = await getSql();
  await sql`
    update entitlements
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        updated_at = now()
    where user_id = ${userId}
      and status = 'active'
  `;
  return readSnapshot(userId);
}

export async function applyHaltedSubscription(userId: string): Promise<BillingSnapshot> {
  const sql = await getSql();
  await sql`
    update entitlements
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        period_end = now(),
        updated_at = now()
    where user_id = ${userId}
  `;
  return readSnapshot(userId);
}

export async function rememberCheckout(userId: string, subscriptionId: string, customerId?: string | null): Promise<void> {
  const sql = await getSql();
  const customer = customerId ?? null;
  await sql`
    update entitlements
    set razorpay_subscription_id = ${subscriptionId},
        razorpay_customer_id = coalesce(${customer}, razorpay_customer_id),
        updated_at = now()
    where user_id = ${userId}
  `;
}

export const startSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SubscribeResult> => {
    const { subscribeMode, createChamberCheckout, fetchSubscription } = await import("./razorpay.server");
    const mode = subscribeMode();
    const row = await ensureTrial(context.userId);
    const snap = await markSnapshot(computeSnapshot(row));

    if (mode === "unset") return { kind: "unset", snap };
    if (mode === "preview") return { kind: "preview", snap: await grantPreview(context.userId) };

    if (snap.status === "active") return { kind: "active", snap };

    // Dummy Subscribe left a paid window and no Razorpay id. Keep it until it
    // lapses — do not open Checkout on top of days they already have.
    if (snap.status === "cancelled" && snap.canUseAi && !row.razorpay_subscription_id) {
      return { kind: "covered", snap };
    }

    if (row.razorpay_subscription_id) {
      try {
        const existing = await fetchSubscription(row.razorpay_subscription_id);
        if (existing.status === "active" || existing.status === "authenticated") {
          const paid = await applyPaidSubscription({
            userId: context.userId,
            subscriptionId: existing.id,
            customerId: existing.customer_id,
            currentEnd: existing.current_end,
          });
          return { kind: "active", snap: paid };
        }
      } catch {
        /* fall through and create */
      }
    }

    const account = await accountOf(context.userId);
    const checkout = await createChamberCheckout({
      userId: context.userId,
      name: account.name,
      email: account.email,
      existingSubscriptionId: row.razorpay_subscription_id,
    });
    await rememberCheckout(context.userId, checkout.subscriptionId);
    return { kind: "checkout", snap, checkout };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { paymentId?: string; subscriptionId?: string; signature?: string }) => ({
    paymentId: String(input?.paymentId ?? "").trim(),
    subscriptionId: String(input?.subscriptionId ?? "").trim(),
    signature: String(input?.signature ?? "").trim(),
  }))
  .handler(async ({ context, data }): Promise<BillingSnapshot> => {
    const { assertCheckout, fetchSubscription } = await import("./razorpay.server");
    if (!assertCheckout(data.paymentId, data.subscriptionId, data.signature)) {
      throw new Error("Payment could not be verified.");
    }
    const row = await fetchRow(context.userId);
    if (row?.razorpay_subscription_id && row.razorpay_subscription_id !== data.subscriptionId) {
      throw new Error("Payment does not match this chamber.");
    }
    const sub = await fetchSubscription(data.subscriptionId);
    return applyPaidSubscription({
      userId: context.userId,
      subscriptionId: sub.id,
      customerId: sub.customer_id,
      currentEnd: sub.current_end,
    });
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const { paymentsLive, cancelRemoteSubscription } = await import("./razorpay.server");
    const row = await fetchRow(context.userId);
    if (paymentsLive() && row?.razorpay_subscription_id) {
      await cancelRemoteSubscription(row.razorpay_subscription_id);
    }
    return applyCancelledSubscription(context.userId);
  });

type RazorpayEvent = {
  event?: string;
  payload?: {
    subscription?: { entity?: RazorpaySubPayload };
    invoice?: { entity?: { subscription_id?: string } };
  };
};

type RazorpaySubPayload = {
  id?: string;
  status?: string;
  current_end?: number | null;
  customer_id?: string | null;
  notes?: Record<string, string> | null;
};

export async function applyRazorpayEvent(event: RazorpayEvent): Promise<void> {
  const name = String(event.event ?? "");
  const sub = event.payload?.subscription?.entity;
  const invoiceSubId = event.payload?.invoice?.entity?.subscription_id;
  const subscriptionId = sub?.id || invoiceSubId;
  if (!subscriptionId) return;

  let row = await fetchRowBySubscription(subscriptionId);
  const noteUser = sub?.notes?.user_id?.trim();
  if (!row && noteUser) row = await fetchRow(noteUser);
  if (!row) return;

  if (
    name === "subscription.activated" ||
    name === "subscription.charged" ||
    name === "subscription.authenticated" ||
    name === "invoice.paid"
  ) {
    let currentEnd = sub?.current_end;
    if (currentEnd == null && name !== "invoice.paid") {
      try {
        const { fetchSubscription } = await import("./razorpay.server");
        const live = await fetchSubscription(subscriptionId);
        currentEnd = live.current_end;
      } catch {
        /* periodEndIso falls back to +30 days */
      }
    }
    await applyPaidSubscription({
      userId: row.user_id,
      subscriptionId,
      customerId: sub?.customer_id,
      currentEnd,
    });
    return;
  }

  if (name === "subscription.cancelled" || name === "subscription.completed") {
    await applyCancelledSubscription(row.user_id);
    return;
  }

  if (name === "subscription.halted") {
    await applyHaltedSubscription(row.user_id);
  }
}
