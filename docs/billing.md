# Billing and trial

CiteBench sells a **chamber**: diary + matters + research + order reading. There is one plan. There is **no company** behind it — an individual Razorpay account is enough.

| Constant | Value | Code |
|---|---|---|
| Trial length | 30 days **or** 10 live CNR fetches, whichever comes first | `DEFAULT_TRIAL_DAYS` / `DEFAULT_TRIAL_CNR_FETCHES` (admin can change) |
| Plan id | `chamber_monthly` | `PLAN_ID` |
| Price | ₹500 / month, all-in | `PLAN_PRICE_INR` |
| GST | Not added. No GSTIN. | `billingCopy.gst` |
| Collector | Razorpay Standard Checkout (UPI, card, netbanking) | `src/lib/billing/razorpay.server.ts` |

## When the clock starts

**Not** on sign-up. **Not** on loading the sample chamber.

The first AI call on **non-sample** work calls `ensureTrial`, which inserts `entitlements` with `trial_ends_at = now() + trial_days`. Until that row exists, `readSnapshot` returns `unstartedSnapshot()`: status `trial`, `trialStarted: false`, `canUseAi: true`.

Live CNR fetches (the connected court-data API, not sample) increment `cnr_fetches_used`. Trial ends when the date lapses **or** the fetch cap is reached.

Admin → Stats sets chamber defaults. Admin → Users sets a per-user cap and can reset the count.

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
| Preview or public chamber | `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Opens Razorpay Standard Checkout. Chamber turns **on only after** a verified payment (HMAC of `order_id\|payment_id`). |

Live path (Standard Checkout, Orders API):

1. `POST /api/create-order` (or Subscribe on `/billing`) creates a Razorpay order for ₹500 (50000 paise). Amount below 100 paise is rejected.
2. Checkout.js opens with that `order_id`. UPI / card / netbanking.
3. On success the browser sends `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature` to `POST /api/verify-payment` (or `confirmCheckout`).
4. Server checks HMAC-SHA256(`order_id|payment_id`, key secret). Mismatch → 400, **not** marked paid. Missing fields → 400.
5. Order amount must be ₹500 and the order note must match this user. Then `period_end` = now + 30 days.
6. **Cancel** stops the local row. There is no auto-debit — the next month is another Checkout. Access continues until `period_end`.
7. Optional webhook `/api/billing/razorpay` still accepts subscription events if a webhook secret is set later.

The browser is never trusted to flip `status = active`. The Key Secret never reaches the browser.

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
   | `RAZORPAY_KEY_ID` | Key Id (Checkout uses this; server sends it to the sheet) |
   | `RAZORPAY_KEY_SECRET` | Key Secret (**server only**) |
   | `RAZORPAY_WEBHOOK_SECRET` | Optional. Only if you add the webhook below. |

4. Optional. In the Razorpay dashboard, add a webhook to **https://citebench.ordereasy.win/api/billing/razorpay** if you later turn on subscriptions.

5. Do **not** turn on GST invoices. The price is ₹500, not ₹500 + tax. If turnover later needs a GSTIN, that is a separate step.

Test keys do not take real money. Live keys do. Test card: `4111 1111 1111 1111`, any future expiry, any CVV. Each successful payment covers 30 days — there is no auto-debit until you add a subscription.

## Banner

`BillingBanner` sits under the header. Idle trial (sample only) vs days left vs expired → link to `/billing`.

## Tests

`src/lib/billing/plan.test.ts` — day math, paid vs trial vs expired, cancelled-but-unlapsed, unstarted snapshot.

`src/lib/billing/signatures.test.ts` — Checkout HMAC, webhook HMAC, `current_end` → `period_end`.

## Product copy to keep aligned

If you change the price or trial length, update **both** `src/lib/billing/plan.ts` constants **and** `src/lib/billing/copy.ts` (`hi` and `en`). The UI prints `c.price` from copy, not a formatted `PLAN_PRICE_INR`.
