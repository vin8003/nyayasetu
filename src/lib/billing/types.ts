import type { BillingSnapshot } from "./plan";

export type CheckoutSession = {
  keyId: string;
  subscriptionId: string;
  name: string;
  description: string;
  prefillName: string;
  prefillEmail: string;
};

export type SubscribeResult =
  | { kind: "preview"; snap: BillingSnapshot }
  | { kind: "active"; snap: BillingSnapshot }
  | { kind: "covered"; snap: BillingSnapshot }
  | { kind: "unset"; snap: BillingSnapshot }
  | { kind: "checkout"; snap: BillingSnapshot; checkout: CheckoutSession };
