# CiteBench

Practice assistant for Indian advocates: a court diary, matter files, order inbox, and a case-law research desk in one chamber.

English and Hindi. **Not legal advice** — research and practice assistance only. Verify every date, direction, and citation on the original record before you file.

The GitHub repository is still named [`vin8003/nyayasetu`](https://github.com/vin8003/nyayasetu). The product name in the app is **CiteBench**.

---

## What it does

After you sign in you get a chamber with five surfaces:

| Surface | Route | What you do there |
|---|---|---|
| **Today** | `/` | Hearings today, upcoming listings, deadlines, open tasks, unconfirmed orders, stale matters |
| **Diary** | `/diary` | Chronological list of listings, linked to the matter |
| **Matters** | `/matters` | Client files: parties, stage, hearings, documents, timeline, hearing brief |
| **Research** | `/research` | Facts in → Indian case-law memo → notice / reply / petition drafts |
| **Inbox** | `/inbox` | Paste an order; the model extracts directions; **you** confirm before the chamber updates |

A **sample chamber** (three demo matters) is free and does **not** start the 30-day trial. The clock starts when you run AI on **your** matter.

Plan: **30 days free** on your own work, then **₹500 / month** (GST extra). Card collection is not live yet — `/billing` records the subscription on the account as a preview.

---

## Trust rules (short)

CiteBench is built so a model cannot quietly invent a judgment or turn a suggestion into a court direction.

- **Research search** uses xAI `web_search` only on [Indian Kanoon](https://indiankanoon.org), [LiveLaw](https://www.livelaw.in), [CaseMine](https://www.casemine.com), [eSCR](https://judgments.ecourts.gov.in), and [sci.gov.in](https://sci.gov.in).
- A precedent is **verified** only if its `http(s)` URL was actually retrieved **and** the host is on that allowlist. The model’s `verified` boolean is overwritten.
- Court drafts (notice, reply, petition) **do not search**. They may cite only authorities that already passed that gate; invented names are stripped from prose.
- On a matter file, **court directions** and **CiteBench suggestions** are separate origins. Suggestions never become directions without a human confirm.
- Screen links go through `httpHref` — `javascript:` and other non-http URLs are dropped.

Full write-up: [docs/trust-and-citations.md](docs/trust-and-citations.md).

---

## Sign in

- Continue with **Google**
- Continue with **X**
- **Email or username + password** (register once; password at least 8 characters)

Each account keeps its own matters, memos, and entitlement. UI language: **EN** / **हि** in the header.

---

## Quick start

```bash
git clone https://github.com/vin8003/nyayasetu.git
cd nyayasetu
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

| You want | What to set |
|---|---|
| Local desk with a throwaway DB | Nothing. Embedded **PGLite** applies `migrations/*.sql` on boot. |
| Live research / order reading / drafts | `XAI_API_KEY` |
| Persistent Postgres (deploy) | `DATABASE_URL` |
| Federated Google / X on a real domain | `VITE_AUTH_ENABLED`, `GROK_AUTH_*`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` |

Without `XAI_API_KEY`, AI calls fail closed with `AI_UNAVAILABLE` (the UI shows the existing error toast). You can still create matters, diary listings, and load the sample chamber.

Details: [docs/local-development.md](docs/local-development.md).

---

## Commands

```bash
npm run dev          # Vite on 0.0.0.0:8080
npm run typecheck    # tsc --noEmit
npm test             # scripts + billing + research + practice + auth unit tests
npm run lint
npm run db:migrate   # apply migrations/*.sql to DATABASE_URL (no-op without it)
npm run build        # production build, then migrate
```

`npm test` includes `scripts/**/*.test.mjs`. Some of those fixtures expect a local `.grok/` tree that is gitignored — if those fail in a clean clone, run the listed unit glob instead:

```bash
npx tsc --noEmit
node --experimental-strip-types --test \
  src/lib/app-data/app-data.test.ts \
  src/lib/auth/gate-identity.test.ts \
  src/lib/billing/*.test.ts \
  src/lib/research/*.test.ts \
  src/lib/practice/*.test.ts
```

---

## How the pieces fit

```text
Browser (TanStack Start + React)
  ├── AppShell  Today · Diary · Matters · Research · Inbox
  └── Server functions (authMiddleware)
        ├── practice/store     clients, matters, hearings, orders, tasks, deadlines
        ├── practice/extract-order   paste → directions + suggestions (human confirm)
        ├── practice/hearing-brief   matter bundle → hearing note
        ├── billing/store      trial clock + chamber_monthly entitlement
        ├── research/run       Grok + web_search → stamped memo
        ├── research/letter    Grok, no tools → notice | reply | petition
        └── research/files     text PDF (unpdf), image OCR, plain text
```

Schema lives in `migrations/` (`0001_auth`, `0002_memos`, `0003_practice`, `0004_billing`). Do not create tables inside server functions.

More: [docs/architecture.md](docs/architecture.md).

---

## Documentation

| Doc | Contents |
|---|---|
| [docs/product.md](docs/product.md) | Screen-by-screen product tour |
| [docs/architecture.md](docs/architecture.md) | Stack, request paths, modules |
| [docs/practice-chamber.md](docs/practice-chamber.md) | Diary, matters, workflow stages, sample pack, inbox |
| [docs/research-and-drafts.md](docs/research-and-drafts.md) | Memo pipeline and court drafts |
| [docs/trust-and-citations.md](docs/trust-and-citations.md) | Citation gate, scrub, `httpHref` |
| [docs/billing.md](docs/billing.md) | Trial, ₹500 plan, paywall, sample exemption |
| [docs/data-model.md](docs/data-model.md) | Tables and JSON blobs |
| [docs/local-development.md](docs/local-development.md) | Env, auth modes, tests, deploy notes |

---

## Disclaimer

CiteBench is **not** a lawyer, **not** a filing system, and **not** a substitute for the eCourts record. Dates, operative directions, and citations must be checked against the original judgment or order before they go into a pleading.
