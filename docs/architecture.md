# Architecture

CiteBench is a TanStack Start (Vite + React) app. The browser talks to **server functions** (`createServerFn`) that run behind `authMiddleware`. There is no separate API service.

## Stack

| Layer | Choice |
|---|---|
| UI | React 19, TanStack Router / Start, Tailwind 4 |
| Auth | Better Auth at `/api/auth/*`; Google & X via a Grok auth broker; local username/password enabled |
| Data | Postgres (`DATABASE_URL` / Neon) or in-process **PGLite** when that URL is unset. Neon queries for Today and a matter file run in parallel. |
| Schema | `migrations/*.sql`, applied at PGLite boot, on Neon first `getSql()`, and `npm run db:migrate` |
| Models | xAI Responses / Chat Completions (`XAI_API_KEY`) |
| Tests | Node test runner (`node --experimental-strip-types --test`) |

## Routes

```text
/                 Today board
/diary            Hearings
/matters          Matter list
/matters/$id      Matter record
/research         Research desk  (?matter= optional)
/inbox            Order paste + confirm queue
/billing          Trial + ₹500 chamber
/story            Public first-day article (no login)
/login            Google, X, username/password
/api/auth/*       Better Auth
```

Shell: `src/components/app-shell.tsx` (desktop nav + mobile tab bar).

## Module map

```text
src/
  routes/                 file routes
  components/             AppShell, ResearchDesk, MatterRecord, IntakeForm, …
  lib/
    auth/                 Better Auth, middleware, visitor host, gate identity
    db.ts                 Neon vs PGLite, getSql()
    billing/              plan math, entitlements, gateAi()
    practice/             types, store, workflow, sample, extract-order, hearing-brief, task-draft
    research/             run, follow-up, verify, letter, files, courts, copy, store, history-search
```

## Request paths

### Authenticated server function

1. Client calls e.g. `getTodayBoard()` / `runResearch({ data })`.
2. `authMiddleware` resolves `context.userId` (session cookie or bearer token in preview).
3. Handler uses `getSql()` for that user’s rows only (`where user_id = …`).
4. AI handlers also call `gateAi(userId, { demo })`. Sample-shaped work is `demo: true` and does not consume trial.

### Research

```text
ResearchDesk → runResearch
  → gateAi
  → xAI Responses + web_search (LEGAL_DOMAINS, max 3 tool calls)
  → parseResearchMemo
  → stampPrecedents(citationUrls)
  → { ok, memo }
```

Timeout 90s, 12k output tokens, model `grok-4.20-0309-non-reasoning`. Failures: `PAYWALL`, `AI_UNAVAILABLE`, parse/timeout errors mapped in the desk.

### Follow-up memo

```text
MemoView → runFollowUp
  → gateAi
  → xAI Responses + web_search (LEGAL_DOMAINS, max 3 tool calls)
  → parseResearchMemo
  → stampPrecedents(parent URLs ∪ this run)
  → saveMemoRecord({ parentId })
```

Same timeout/token budget as research. Does not overwrite the parent.

### Court draft (from the memo)

```text
MemoView onDraft(kind) → draftLetter
  → gateAi
  → xAI Responses, JSON object, **no tools key**
  → parseLetterDraft
  → assembleLetter (cite filter + unverified scrub)
  → LetterView
```

Timeout 45s, 4k output tokens, same non-reasoning model. Drafts are **not** inserted into SQL.

### Draft this (from a task or deadline)

```text
Today / MatterRecord → draftForWork
  → classifyTaskDraft (title + quote)
  → gateAi
  → Chat Completions JSON, **no web_search**
  → saveAiDraftDocument (matter_documents, source_kind ai_draft)
```

Timeout 45s. Sample chamber falls back to a deterministic skeleton if the model is down. Gather / appearance titles are not drafted. The task is not marked done.

### Order extract / hearing brief

Chat Completions, model `grok-4.5`, JSON object, 25s abort. Extract writes an unconfirmed `matter_orders` row; confirm copies directions into tasks/deadlines/hearings with origin `court_direction` vs `ai_suggestion`.

## Auth modes

Documented in `src/lib/auth/server.ts`:

| Mode | When | Sessions |
|---|---|---|
| Deployed | `GROK_AUTH_*` + `BETTER_AUTH_URL` + `DATABASE_URL` | Postgres |
| Live preview | No injection; preview broker client | PGLite (wiped on process restart) |
| Auth off | `VITE_AUTH_ENABLED=false` **and** no `DATABASE_URL` | Dev user, no providers |

`VITE_AUTH_ENABLED=false` **with** `DATABASE_URL` fail-closes (must not mix a real DB with a fake user).

Google/X callbacks on custom hosts (`citebench.ordereasy.win`, `nyayasetu.ordereasy.win`, `*.ordereasy.win`) pin the visitor domain so the session cookie is not issued for the wrong Host. See `src/lib/auth/visitor-host.ts`.

## Isolation

Every practice and memo query is scoped by `user_id` from the verified session. Sample seed and sample purge also filter by that id (and by known sample titles / case numbers).

## What not to add in this layout

- A second search client besides `run.ts` / `follow-up.ts` (same `LEGAL_DOMAINS`)
- Tables created in handlers (use a migration)
- Kind `if`s in `LetterView` (headings come from `letterChrome`)
- Mixing `suggestedTasks` into `directions` in the order extractor
