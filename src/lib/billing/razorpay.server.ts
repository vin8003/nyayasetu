import { getSql } from "@/lib/db";
import { PLAN_ID, PLAN_PRICE_INR } from "./plan";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./signatures";
import type { CheckoutSession } from "./types";

export type { CheckoutSession } from "./types";

const API = "https://api.razorpay.com/v1";
const PLAN_NAME = "CiteBench chamber";
const TOTAL_COUNT = 120;

export type SubscribeMode = "razorpay" | "preview" | "unset";

export type RazorpaySubscription = {
  id: string;
  status?: string;
  current_end?: number | null;
  customer_id?: string | null;
  notes?: Record<string, string> | null;
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function paymentsLive(): boolean {
  return Boolean(env("RAZORPAY_KEY_ID") && env("RAZORPAY_KEY_SECRET") && env("RAZORPAY_WEBHOOK_SECRET"));
}

/**
 * preview  — Grok live preview / PGLite: record membership without charging.
 * razorpay — keys present: Checkout, entitlement only after payment.
 * unset    — public Neon without keys: refuse the free toggle.
 */
export function subscribeMode(): SubscribeMode {
  if (paymentsLive()) return "razorpay";
  if (!env("DATABASE_URL")) return "preview";
  return "unset";
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${env("RAZORPAY_KEY_ID")}:${env("RAZORPAY_KEY_SECRET")}`).toString("base64")}`;
}

async function rzp<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { description?: string; reason?: string };
  } & T;
  if (!res.ok) {
    const desc = json.error?.description || json.error?.reason || `Razorpay ${res.status}`;
    throw new Error(desc);
  }
  return json as T;
}

async function ensurePlanId(): Promise<string> {
  const fromEnv = env("RAZORPAY_PLAN_ID");
  if (fromEnv) return fromEnv;
  const sql = await getSql();
  const rows = await sql<{ razorpay_plan_id: string | null }>`
    select razorpay_plan_id from billing_config where id = 'default' limit 1
  `;
  const stored = rows[0]?.razorpay_plan_id?.trim();
  if (stored) return stored;
  const plan = await rzp<{ id: string }>("POST", "/plans", {
    period: "monthly",
    interval: 1,
    item: {
      name: PLAN_NAME,
      amount: PLAN_PRICE_INR * 100,
      currency: "INR",
      description: "Diary, matters, orders, and Indian case-law research",
    },
    notes: { plan: PLAN_ID },
  });
  await sql`
    insert into billing_config (id, razorpay_plan_id, updated_at)
    values ('default', ${plan.id}, now())
    on conflict (id) do update set razorpay_plan_id = ${plan.id}, updated_at = now()
  `;
  return plan.id;
}

async function ensureCustomer(userId: string, name: string, email: string): Promise<string | null> {
  if (!email) return null;
  try {
    const customer = await rzp<{ id: string }>("POST", "/customers", {
      name: name || "Advocate",
      email,
      fail_existing: "0",
      notes: { user_id: userId },
    });
    return customer.id;
  } catch {
    return null;
  }
}

export async function createChamberCheckout(opts: {
  userId: string;
  name: string;
  email: string;
  existingSubscriptionId: string | null;
}): Promise<CheckoutSession> {
  const keyId = env("RAZORPAY_KEY_ID");
  if (!keyId) throw new Error("Payment account is not connected.");

  if (opts.existingSubscriptionId) {
    try {
      const existing = await rzp<RazorpaySubscription>("GET", `/subscriptions/${opts.existingSubscriptionId}`);
      if (existing.status === "created") {
        return session(keyId, existing.id, opts.name, opts.email);
      }
    } catch {
      /* create a fresh one */
    }
  }

  const planId = await ensurePlanId();
  const customerId = await ensureCustomer(opts.userId, opts.name, opts.email);
  const sub = await rzp<RazorpaySubscription>("POST", "/subscriptions", {
    plan_id: planId,
    total_count: TOTAL_COUNT,
    quantity: 1,
    customer_notify: 1,
    ...(customerId ? { customer_id: customerId } : {}),
    notes: { user_id: opts.userId, plan: PLAN_ID },
  });
  return session(keyId, sub.id, opts.name, opts.email);
}

function session(keyId: string, subscriptionId: string, name: string, email: string): CheckoutSession {
  return {
    keyId,
    subscriptionId,
    name: "CiteBench",
    description: `Chamber · ₹${PLAN_PRICE_INR} / month`,
    prefillName: name,
    prefillEmail: email,
  };
}

export async function fetchSubscription(id: string): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>("GET", `/subscriptions/${id}`);
}

export async function cancelRemoteSubscription(id: string): Promise<void> {
  await rzp("POST", `/subscriptions/${id}/cancel`, { cancel_at_cycle_end: 1 });
}

export function assertCheckout(paymentId: string, subscriptionId: string, signature: string): boolean {
  return verifyCheckoutSignature(paymentId, subscriptionId, signature, env("RAZORPAY_KEY_SECRET"));
}

export function assertWebhook(rawBody: string, signature: string): boolean {
  return verifyWebhookSignature(rawBody, signature, env("RAZORPAY_WEBHOOK_SECRET"));
}
