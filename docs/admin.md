# Admin desk

CiteBench has a **login-only** admin desk. There is no `/admin/register` and no second user table.

## Who can open it

1. The person already has a Better Auth account (Google, X, or `/login` register).
2. Their email is listed in `ADMIN_EMAILS` or `ADMIN_EMAIL` (App Secrets / `.env`).
3. They sign in at `/admin/login`, `/login?desk=1`, **or** they are already signed in on the chamber and visit `/admin`.

If the env list is empty, every admin server function fails closed.

```text
ADMIN_EMAILS=you@example.com,other@example.com
```

Comma or space separated. Compared case-insensitively.

## What it can do

| Page | Purpose |
|---|---|
| `/admin` | Users, 7-day / 30-day signups, trial / active / cancelled / expired, paid vs dummy grants, matter + memo totals |
| `/admin/users` | Search name or email |
| `/admin/users/$id` | That user's plan, access date, Razorpay id, matter/memo counts |

Plan actions on a user (they do **not** charge Razorpay):

| Action | Effect |
|---|---|
| Grant 30 days | `active`. `period_end = max(now, existing) + 30 days`. Clears `cancelled_at`. |
| Cancel (keep leftover) | `cancelled`. Access continues until `period_end`. |
| Reset to trial | Fresh 30-day trial. Clears paid fields. |
| End access now | `cancelled` with `period_end` and `trial_ends_at` set to now. |

## Session

Same Better Auth cookie / bearer token as the chamber. `adminSession` and every mutation run `authMiddleware` then check the allowlist against `"user".email`. A signed-in chamber account that is **not** on the list sees “Desk only.”

## Publish

Set `ADMIN_EMAILS` in Grok App Builder secrets, then republish from the App Builder workspace that contains these files (GitHub `main` alone does not update `citebench.ordereasy.win`). After publish:

- Preferred: `https://<host>/admin/login`
- Fallback on the existing login route: `https://<host>/login?desk=1`
