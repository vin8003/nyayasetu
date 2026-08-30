# Local development

## Requirements

- Node.js 22+ recommended (the app uses `node --experimental-strip-types`)
- `npm install`

## Run

```bash
npm run dev
```

Vite listens on `0.0.0.0:8080` via `scripts/with-app-env.mjs` (merges `.grok/app-env.json` `VITE_*` keys into the process env if that file exists; gitignored).

Open [http://localhost:8080](http://localhost:8080).

## Environment

Copy `.env.example` to `.env` if you need secrets. Do not commit `.env`.

| Variable | Required for | Notes |
|---|---|---|
| `XAI_API_KEY` | Research, follow-up, drafts, OCR, order extract, hearing brief, Draft this | Fail-closed as `AI_UNAVAILABLE` when unset |
| `DATABASE_URL` | Persistent Postgres | Unset → in-memory PGLite (preview/dev). Empty string counts as unset |
| `VITE_AUTH_ENABLED` | `"false"` disables providers | Default (unset) shows sign-in. `"false"` + `DATABASE_URL` is forbidden |
| `GROK_AUTH_ISSUER` | Federated Google/X | Defaults to the shared broker |
| `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` | Deployed OAuth | Preview falls back to the sandbox client |
| `BETTER_AUTH_URL` | Canonical auth origin | Custom domains also use visitor-host pinning |
| `BETTER_AUTH_SECRET` | Cookie signing | Preview mints a process-local secret |
| `AUTH_ALLOWED_HOSTS` | Extra allowed Hosts | Comma-separated |
| `GROK_PROJECT_ID` / `GROK_GATE_ORIGIN` | Grok gate identity | Optional; used when the app is embedded in the Grok host |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Live Subscribe | Standard Checkout. Test keys (`rzp_test_`) do not take real money. See [billing.md](billing.md) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional webhook | Only if `/api/billing/razorpay` is used |

Username/password is on (`src/lib/auth/email-password.ts` → `emailAndPasswordEnabled = true`). Register from `/login`.

## Database

**No `DATABASE_URL`:** PGLite in process. `migrations/0001_auth.sql` … `0005_memo_parent.sql` apply on boot. Restarting the dev server **wipes** the chamber.

**With `DATABASE_URL`:** `pg` pool. Pending `migrations/*.sql` apply on first `getSql()` (and at the end of `npm run build` via `db:migrate`).

Never create tables in `createServerFn` handlers.

## Tests

```bash
npm run typecheck
npm test
```

Focused (skips `scripts/` fixtures that need `.grok/`):

```bash
node --experimental-strip-types --test \
  src/lib/app-data/app-data.test.ts \
  src/lib/auth/gate-identity.test.ts \
  src/lib/billing/*.test.ts \
  src/lib/research/*.test.ts \
  src/lib/practice/*.test.ts \
  src/lib/scroll-memory.test.ts
```

Useful files: `src/lib/billing/plan.test.ts`, `src/lib/research/verify.test.ts`, `src/lib/research/letter-*.test.ts`, `src/lib/research/follow-up.test.ts`, `src/lib/research/history-search.test.ts`, `src/lib/practice/sample.test.ts`, `src/lib/practice/task-draft.test.ts`, `src/lib/practice/intake-from-matter.test.ts`, `src/lib/scroll-memory.test.ts`.

## Auth in local vs deploy

1. **Local, auth on, PGLite** — register a username, or use Google/X if the preview broker accepts your callback host.
2. **Custom domain** — `src/lib/auth/visitor-host.ts` allowlists `citebench.ordereasy.win`, `nyayasetu.ordereasy.win`, `*.ordereasy.win` so OAuth cookies stick to the address bar, not a proxied inner host.
3. **Auth off** — `VITE_AUTH_ENABLED=false` and **no** `DATABASE_URL`. Server functions run as the dev user. Do not do this against production Neon.

## AI without a key

You can still:

- Sign in (local password)
- Load / exit the sample chamber
- Create matters and hearings
- Open workflow copy on a matter record

You cannot run research, follow-ups, memo letters, **Draft this** (except the sample skeleton), order extract, or hearing brief until `XAI_API_KEY` is set.

## Build

```bash
npm run build
```

Vite production build, then migrate if `DATABASE_URL` is set. `VITE_*` must match between `dev` and `build` (both go through `with-app-env.mjs`) or you will see “auth works in dev, not in preview” bugs.

## Code habits

- New copy: both `hi` and `en` (`src/lib/practice/copy.ts`, `src/lib/research/copy.ts`, `src/lib/billing/copy.ts`).
- New letter kind: extend `LETTER_KINDS`, `letterChrome`, and `kindLine` together (`Record<LetterKind, …>`).
- New AI: `authMiddleware` + `gateAi` + no `web_search` unless you are `run.ts` or `follow-up.ts`.
- User-visible dates and cites: keep court vs AI origins separate.
