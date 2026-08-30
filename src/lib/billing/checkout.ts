import type { CheckoutSession } from "./types";

export type CheckoutConfirmation = {
  paymentId: string;
  subscriptionId: string;
  signature: string;
};

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void };

function razorpayCtor(): RazorpayCtor | null {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  return w.Razorpay ?? null;
}

function loadScript(): Promise<RazorpayCtor> {
  const existing = razorpayCtor();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const ctor = razorpayCtor();
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay Checkout did not load."));
    };
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

/** Opens Razorpay Checkout. Resolves the signed payment, or null if the sheet was dismissed. */
export async function openRazorpayCheckout(session: CheckoutSession): Promise<CheckoutConfirmation | null> {
  const Razorpay = await loadScript();
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: session.keyId,
      subscription_id: session.subscriptionId,
      name: session.name,
      description: session.description,
      theme: { color: "#8ab4c8" },
      prefill: {
        name: session.prefillName,
        email: session.prefillEmail,
      },
      handler: (response: {
        razorpay_payment_id?: string;
        razorpay_subscription_id?: string;
        razorpay_signature?: string;
      }) => {
        const paymentId = String(response.razorpay_payment_id ?? "");
        const subscriptionId = String(response.razorpay_subscription_id ?? "");
        const signature = String(response.razorpay_signature ?? "");
        if (!paymentId || !subscriptionId || !signature) {
          reject(new Error("Payment did not return a signature."));
          return;
        }
        resolve({ paymentId, subscriptionId, signature });
      },
      modal: {
        ondismiss: () => resolve(null),
      },
    });
    checkout.open();
  });
}
