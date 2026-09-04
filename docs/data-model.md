# Data model

Schema is **only** `migrations/*.sql`. PGLite applies those files on first `getSql()`. Production Neon applies the same files on first connect **and** via `npm run db:migrate` at build. Both record applied files in `_migrations`. Auth Better Auth tables live in `migrations/0001_auth.sql` (and the unused opt-in copy under `migrations/auth/` is not auto-applied).

## `0002_memos.sql`

```text
memos
  id, user_id, title, intake_json, memo_json, created_at
```

`intake_json` / `memo_json` are stringified `Intake` and `LegalMemo`. Unfiltered list: **80**, newest first. Search seed: **40**, then hydrate parents/children (cap ~120). No letter table.

## `0005_memo_parent.sql`

```text
memos.parent_id    nullable — id of the memo this row follows up
memos_parent_id_idx
```

Follow-up always inserts a new row. It never updates the parent. `research/store.ts` also `ALTER`s the column on first list/save so a warm Neon that missed migrate still gets it.

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
                   source_kind: paste | ai_draft | sample seed (`paste` default)
matter_orders      id, user_id, matter_id, document_id?, order_date, body,
                   directions_json, confirmed
tasks              id, user_id, matter_id?, title, origin, status, due_on, source_quote
deadlines          id, user_id, matter_id?, title, due_on, origin, source_quote, status
timeline_events    id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id

memos.matter_id    nullable — set when research is run from a matter
```

```text
matters            … source_url, court_source_id, last_synced_at, import_status
matter_documents   … source_url, external_id, content_hash, retrieved_at
timeline_events    … verification (unreviewed | court_imported | ai_inferred | lawyer_verified)

case_imports       id, user_id, matter_id?, court_id, case_number, cnr, lookup_json,
                   status, stage_note, summary_json, error, official_url,
                   captcha_required, demo, created_at, updated_at
case_import_records id, user_id, import_id, matter_id, kind, external_id, order_date,
                   title, source_url, content_hash, body, status, document_id?,
                   order_id?, error, retrieved_at
```

`0007_case_import.sql` adds those columns and tables. Import jobs are user-scoped. Records cascade from the job and from the matter.

## `0004_billing.sql` + `0006_payments.sql`

```text
entitlements
  user_id PK
  status          trial | active | cancelled | expired (expired is usually computed, not stored)
  plan            chamber_monthly
  trial_started_at, trial_ends_at
  subscribed_at, period_end, cancelled_at
  razorpay_customer_id, razorpay_subscription_id
  updated_at

billing_config
  id              'default'
  razorpay_plan_id
```

Access is **computed** from timestamps (`computeSnapshot`), not from trusting `status` alone. A cancelled row with a future `period_end` still has `canUseAi`. `razorpay_subscription_id` stores the last Razorpay order (or an older subscription id). Status becomes `active` only after a verified payment (or the preview grant when there is no Postgres URL and no keys).

## JSON blobs (research)

`LegalMemo` fields that matter for trust: `precedents[].url`, `precedents[].verified` (overwritten), `citationUrls` (retrieved), `unverified[]`.

`LegalLetter` from the research desk is session state; from a matter it is also stored as `matter_documents` (`source_kind = ai_draft`). Standalone desk drafts stay on screen.

`TaskDraft` from **Draft this** is formatted text stored in `matter_documents` (`kind` = writtenStatement | reply | notice | petition | application | affidavit | note). Timeline origin is `ai_suggestion`.

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
- `memos (parent_id)`
- `clients (user_id)`

## Adding a table

1. New file `migrations/0006_….sql` (next number).
2. Keep it idempotent (`if not exists`) where possible.
3. Filter every query by `user_id` from `authMiddleware`.
4. Add tests next to the store/module, not only in scripts.
