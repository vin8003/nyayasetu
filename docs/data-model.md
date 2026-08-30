# Data model

Schema is **only** `migrations/*.sql`. PGLite applies those files on first `getSql()`. Production Neon applies the same files on first connect **and** via `npm run db:migrate` at build. Both record applied files in `_migrations`. Auth Better Auth tables live in `migrations/0001_auth.sql` (and the unused opt-in copy under `migrations/auth/` is not auto-applied).

## `0002_memos.sql`

```text
memos
  id, user_id, title, intake_json, memo_json, created_at
```

`intake_json` / `memo_json` are stringified `Intake` and `LegalMemo`. List limit: 40, newest first. No letter table.

## `0005_memo_parent.sql`

```text
memos.parent_id    nullable — id of the memo this row follows up
```

Follow-up always inserts a new row. It never updates the parent.

## `0003_practice.sql`

```text
clients            id, user_id, name, notes
matters            id, user_id, client_id?, title, proceeding, stage,
                   court_name, case_number, cnr, case_type, jurisdiction,
                   our_side, parties_json, status, next_hearing_on,
                   last_order_on, notes, created_at, updated_at
hearings           id, user_id, matter_id, listed_on, listed_at, court_room,
                   bench, purpose, stage, outcome, next_date, notes
matter_documents   id, user_id, matter_id, kind, title, body, source_kind
matter_orders      id, user_id, matter_id, document_id?, order_date, body,
                   directions_json, confirmed
tasks              id, user_id, matter_id?, title, origin, status, due_on, source_quote
deadlines          id, user_id, matter_id?, title, due_on, origin, source_quote, status
timeline_events    id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id

memos.matter_id    nullable (column added; research/store does not set it yet)
```

`parties_json` and `directions_json` are JSON text. Booleans and dates follow the pg/PGLite normalizers in `src/lib/db.ts` (dates as `YYYY-MM-DD` strings).

## `0004_billing.sql`

```text
entitlements
  user_id PK
  status          trial | active | cancelled | expired (expired is usually computed, not stored)
  plan            chamber_monthly
  trial_started_at, trial_ends_at
  subscribed_at, period_end, cancelled_at
  updated_at
```

Access is **computed** from timestamps (`computeSnapshot`), not from trusting `status` alone. A cancelled row with a future `period_end` still has `canUseAi`.

## JSON blobs (research)

`LegalMemo` fields that matter for trust: `precedents[].url`, `precedents[].verified` (overwritten), `citationUrls` (retrieved), `unverified[]`.

`LegalLetter` is in-memory / client state only.

## Practice JSON

`OrderDirection`: `{ text, party, deadline, quote }`.

`Origin`: `court_direction | ai_suggestion | ai_inference | statute | lawyer | system`.

## Indexes (high traffic filters)

- `matters (user_id)`, `(user_id, next_hearing_on)`
- `hearings (user_id, listed_on)`
- `matter_orders (user_id, confirmed)`
- `tasks (user_id, status)`
- `deadlines (user_id, due_on)`
- `timeline_events (matter_id, happened_on desc)`
- `memos (user_id)`
- `clients (user_id)`

## Adding a table

1. New file `migrations/0005_….sql` (next number).
2. Keep it idempotent (`if not exists`) where possible.
3. Filter every query by `user_id` from `authMiddleware`.
4. Add tests next to the store/module, not only in scripts.
