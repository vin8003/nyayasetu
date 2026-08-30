# Billing and trial

CiteBench sells a **chamber**: diary + matters + research + order reading. There is one plan. There is **no company** behind it — an individual Razorpay account is enough.

| Constant | Value | Code |
|---|---|---|
| Trial length | 30 days | `TRIAL_DAYS` |
| Plan id | `chamber_monthly` | `PLAN_ID` |
| Price | ₹500 / month, all-in | `PLAN_PRICE_INR` |
| GST | Not added. No GSTIN. | `billingCopy.gst` |
| Collector | Razorpay Subscriptions (UPI, card, netbanking) | `src/lib/billing/razorpay.server.ts` |

## When the clock starts

**Not** on sign-up. **Not** on loading the sample chamber.

The first AI call on **non-sample** work calls `ensureTrial`, which inserts `entitlements` with `trial_ends_at = now() + 30 days`. Until that row exists, `readSnapshot` returns `unstartedSnapshot()`: status `trial`, `trialStarted: false`, `canUseAi: true`.

Sample research, sample order extract, and sample hearing briefs pass `gateAi(..., { demo: true })` and skip `ensureTrial`.

## Access (`computeSnapshot`)

```text
paid  = status is active|cancelled AND period_end is still in the future
trial = not paid AND trial_ends_at is still in the future
canUseAi = paid OR trial
```

| Status shown | Meaning |
|---|---|
| Trial idle | No entitlement row yet (sample-only) |
| Trial running | Row exists, trial window open, not paid |
| Chamber on | `active` with a future `period_end` |
| Cancelled | Cancelled but `period_end` still in the future — keep using |
| Expired | Neither trial nor paid window |

`gateAi` for real work: `ensureTrial` then `canUseAi`. If false, handlers return `{ ok: false, error: "PAYWALL" }`. The research desk, follow-up, letter draft, **Draft this**, order extract, hearing brief, and file OCR all share this gate.

## Subscribe / cancel

`/billing` → `startSubscription` / `confirmCheckout` / `cancelSubscription`.

What the Subscribe button does depends on keys, not on a feature flag:

| Where | Keys | What happens |
|---|---|---|
| Live preview (no Postgres URL) | absent | Records one month from now. **Does not charge.** Does not stack on leftover trial. |
| Public chamber (Postgres URL, no Razorpay keys) | absent | Refuses. Copy: payments are not connected yet. |
| Public chamber | `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` | Opens Razorpay Checkout. Chamber turns **on only after** a verified payment (Checkout signature and/or webhook). |

Live path:

1. Create (or reuse) a monthly Razorpay plan at ₹500.
2. Create a subscription. Store `razorpay_subscription_id` on the entitlement. Status stays trial until money moves.
3. Checkout (UPI / card / netbanking).
4. `confirmCheckout` checks HMAC(`payment_id|subscription_id`) and fetches the subscription. Webhook `/api/billing/razorpay` does the same from `subscription.activated` / `subscription.charged` / `invoice.paid`.
5. `period_end` comes from Razorpay `current_end`. Later `subscription.charged` events extend it.
6. **Cancel** tells Razorpay to stop at cycle end (`cancel_at_cycle_end`) and sets local `cancelled`. Access continues until `period_end`.
7. `subscription.halted` (retries exhausted) closes access immediately.

The browser is never trusted to flip `status = active`.

## Dummy Subscribe already on the books

Accounts that used the old preview button have `status` active or cancelled, a `period_end`, and **no** Razorpay id. They were never a customer.

When live keys go on:

| They are | What happens |
|---|---|
| Dummy **active**, period still open | Desk stays open. Cancel only stops the local row. **No charge. No auto-renew.** When the date lapses they expire; the next Subscribe is real Checkout. |
| Dummy **cancelled**, period still open | Same leftover days. Subscribe is hidden until that date. Clicking it anyway does not open Checkout. |
| Trial only, never dummy-subscribed | Unchanged. First Subscribe after keys is Checkout. |
| Dummy grant already expired | Next Subscribe is Checkout. |

Nobody is enrolled into a Razorpay subscription behind their back. Leftover dummy days are not pulled back, and they are not billed again for those days.

## Going live — individual account, no company

Razorpay onboard **individuals**. You do not need a Pvt Ltd, LLP, GSTIN, or CIN.

1. Sign up at [razorpay.com](https://razorpay.com) as **Individual** (or proprietor). KYC is typically:

   - PAN
   - Aadhaar
   - Bank account in your name (savings is fine)
   - A photo, and the live site `https://citebench.ordereasy.win` as the business URL

2. Start with **test** keys (`rzp_test_…`). Pay ₹500 with a test UPI/card. Switch to **live** keys after that works.

3. Put these on the deployed site (same place as `XAI_API_KEY` — not in git):

   | Variable | What it is |
   |---|---|
   | `RAZORPAY_KEY_ID` | Key Id (Checkout uses this) |
   | `RAZORPAY_KEY_SECRET` | Key Secret (server only) |
   | `RAZORPAY_WEBHOOK_SECRET` | Webhook signing secret |
   | `RAZORPAY_PLAN_ID` | Optional. If unset, CiteBench creates the ₹500 monthly plan once and stores it. |

4. In the Razorpay dashboard, add a webhook to **https://citebench.ordereasy.win/api/billing/razorpay** for:

   - `subscription.activated`
   - `subscription.authenticated`
   - `subscription.charged`
   - `subscription.cancelled`
   - `subscription.completed`
   - `subscription.halted`
   - `invoice.paid`

5. Do **not** turn on GST invoices. The price is ₹500, not ₹500 + tax. If turnover later needs a GSTIN, that is a separate step.

Test keys do not take real money. Live keys do. Card recurring is the usual monthly path; UPI Autopay may need Razorpay to switch it on for the account.

## Banner

`BillingBanner` sits under the header. Idle trial (sample only) vs days left vs expired → link to `/billing`.

## Tests

`src/lib/billing/plan.test.ts` — day math, paid vs trial vs expired, cancelled-but-unlapsed, unstarted snapshot.

`src/lib/billing/signatures.test.ts` — Checkout HMAC, webhook HMAC, `current_end` → `period_end`.

## Product copy to keep aligned

If you change the price or trial length, update **both** `src/lib/billing/plan.ts` constants **and** `src/lib/billing/copy.ts` (`hi` and `en`). The UI prints `c.price` from copy, not a formatted `PLAN_PRICE_INR`.
