# Billing and trial

CiteBench sells a **chamber**: diary + matters + research + order reading. There is one plan.

| Constant | Value | Code |
|---|---|---|
| Trial length | 30 days | `TRIAL_DAYS` |
| Plan id | `chamber_monthly` | `PLAN_ID` |
| Price | ₹500 / month | `PLAN_PRICE_INR` |
| GST | Extra (copy only; not calculated) | `billingCopy.gst` |

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

## Subscribe / cancel (preview)

`/billing` → `startSubscription` / `cancelSubscription`.

- **Subscribe** sets `status = active`, `period_end` = 30 days from the later of now and remaining trial end. **Does not charge a card.** Copy on the page says live payments will use this same control.
- **Cancel** sets `status = cancelled` and `cancelled_at`. Access continues until `period_end`.

There is no Stripe/Razorpay module in this tree.

## Banner

`BillingBanner` sits under the header. Idle trial (sample only) vs days left vs expired → link to `/billing`.

## Tests

`src/lib/billing/plan.test.ts` — day math, paid vs trial vs expired, cancelled-but-unlapsed, unstarted snapshot.

## Product copy to keep aligned

If you change the price or trial length, update **both** `src/lib/billing/plan.ts` constants **and** `src/lib/billing/copy.ts` (`hi` and `en`). The UI prints `c.price` from copy, not a formatted `PLAN_PRICE_INR`.
