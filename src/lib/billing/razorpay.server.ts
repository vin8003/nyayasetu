import {
  CHAMBER_AMOUNT_PAISE,
  CHAMBER_CURRENCY,
  PLAN_ID,
  PLAN_PRICE_INR,
  parseOrderAmount,
} from "./plan";
import { paymentsLive } from "./live";
import { verifyOrderCheckoutSignature, verifyWebhookSignature } from "./signatures";
import type { CheckoutSession } from "./types";

export { paymentsLive } from "./live";
export type { CheckoutSession } from "./types";
export { CHAMBER_AMOUNT_PAISE, CHAMBER_CURRENCY, parseOrderAmount } from "./plan";

const API = "https://api.razorpay.com/v1";

export type SubscribeMode = "razorpay" | "preview" | "unset";

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status?: string;
  notes?: Record<string, string> | null;
  receipt?: string | null;
};

export type RazorpaySubscription = {
  id: string;
  status?: string;
  current_end?: number | null;
  customer_id?: string | null;
  notes?: Record<string, string> | null;
};

export class RazorpayHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "RazorpayHttpError";
    this.status = status;
  }
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * preview  — Grok live preview / PGLite, no keys: record membership without charging.
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
    throw new RazorpayHttpError(res.status, desc);
  }
  return json as T;
}

export async function createOrder(opts: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  let amount: number;
  try {
    amount = parseOrderAmount(opts.amount);
  } catch (err) {
    throw new RazorpayHttpError(400, err instanceof Error ? err.message : "Invalid amount.");
  }
  const currency = (opts.currency || CHAMBER_CURRENCY).trim() || CHAMBER_CURRENCY;
  const receipt = (opts.receipt || `cb_${Date.now()}`).slice(0, 40);
  return rzp<RazorpayOrder>("POST", "/orders", {
    amount,
    currency,
    receipt,
    notes: opts.notes ?? {},
  });
}

export async function createChamberCheckout(opts: {
  userId: string;
  name: string;
  email: string;
}): Promise<CheckoutSession> {
  const keyId = env("RAZORPAY_KEY_ID");
  if (!keyId) throw new Error("Payment account is not connected.");
  const order = await createOrder({
    amount: CHAMBER_AMOUNT_PAISE,
    currency: CHAMBER_CURRENCY,
    receipt: `cb_${opts.userId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}_${Date.now()}`.slice(0, 40),
    notes: { user_id: opts.userId, plan: PLAN_ID },
  });
  return {
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: "CiteBench",
    description: `Chamber · ₹${PLAN_PRICE_INR} / month`,
    prefillName: opts.name,
    prefillEmail: opts.email,
  };
}

export async function fetchOrder(id: string): Promise<RazorpayOrder> {
  return rzp<RazorpayOrder>("GET", `/orders/${id}`);
}

export async function fetchSubscription(id: string): Promise<RazorpaySubscription> {
  return rzp<RazorpaySubscription>("GET", `/subscriptions/${id}`);
}

export async function cancelRemoteSubscription(id: string): Promise<void> {
  await rzp("POST", `/subscriptions/${id}/cancel`, { cancel_at_cycle_end: 1 });
}

export function assertOrderCheckout(orderId: string, paymentId: string, signature: string): boolean {
  return verifyOrderCheckoutSignature(orderId, paymentId, signature, env("RAZORPAY_KEY_SECRET"));
}

export function assertWebhook(rawBody: string, signature: string): boolean {
  return verifyWebhookSignature(rawBody, signature, env("RAZORPAY_WEBHOOK_SECRET"));
}
