# Practice chamber

The chamber is everything that is not the research memo: **files, listings, orders, tasks**. Code lives under `src/lib/practice/` and the routes `index`, `diary`, `matters`, `inbox`.

## Why a workflow, not a checklist

Indian proceedings branch. A commercial suit that sits in written-statement is not the same as a criminal case in investigation. `src/lib/practice/workflow.ts` defines proceeding trees:

| id | Use |
|---|---|
| `civil` | Ordinary civil |
| `commercial` | Civil stages with a stricter WS outer limit |
| `criminal` | FIR → investigation → trial |
| `writ` | High Court / SC writ |
| `appellate` | Appeal |
| `family` | Family court |
| `consumer` | Consumer commission |
| `arbitration` | Arb + §9 |
| `execution` | Execution petition |

Each **stage** has: English + Hindi labels, what it means, what the lawyer does, what the court does, typical documents, typical deadlines, next stages, **branches** (e.g. settle → closed), `ai[]` (safe assistance), `human[]` (must not be auto-decided).

`possibleNext(proceeding, stageId)` feeds the matter UI. Stages are data, not a state machine that auto-advances — the lawyer (or a confirmed order’s `stageHint`) moves the file.

## Data the chamber stores

See [data-model.md](data-model.md). In product language:

- **Client** — name + notes
- **Matter** — caption, proceeding, stage, court, case number, CNR, our side, parties JSON, status, next/last hearing dates
- **Hearing** — listed on/at, room, bench, purpose, outcome, next date
- **Document** — pasted or uploaded body (order, pleading, evidence, notice)
- **Order** — body + `directions_json` + `confirmed`
- **Task / deadline** — title, due, **origin**, source quote
- **Timeline event** — what happened, origin, optional ref

All rows are `user_id`-scoped. Deletes cascade from matter where the FK is set.

## Opening a listing, paper, or task

The matter record (`src/components/matter-record.tsx`) is a list of rows. A row opens **MatterSheet** — a `position:fixed` overlay (`z-index: 50`) above the sticky header (`z-30`) and the mobile tab bar (`z-40`). The first control is **← Back** (`.sheet-back`). Escape and the backdrop also close.

Diary rows (`src/routes/diary.tsx`) go to `/matters/$id` with `hash: hearing.id`. Today’s **Draft this** uses `/matters/$id#<itemId>`. If the file **landed** with a hash, Back is `history.back()` so the diary (or Today) is restored. Opening and closing a row while already on the file does **not** rewrite the hash — a `#id` that matches the row’s DOM `id` would otherwise jump the page.

While the sheet is open the body is locked with `position: fixed; top: -<scrollY>px` (iOS `overflow: hidden` on `html`/`body` zeros `scrollY`). Close restores that Y.

Particulars, a listing, a paper, an order, a task, a deadline, and a timeline note are all **editable in the sheet**. Save writes the existing row; it does not insert a duplicate.

## Scroll restore

`src/lib/scroll-memory.ts` + `<ScrollMemory />` in `__root`. Before an in-app navigation, the current `scrollY` is stored in `sessionStorage` under `citebench.scroll:<path+search>`. After the next page is tall enough, that Y is restored. `pathKey` coerces `location.search` to a string (TanStack does not always give one during SSR). A new page with no saved offset is left at the top — it does not force `scrollTo(0, 0)` over a live offset.

## Inbox confirm path

1. Paste ≥ 40 characters of order text, **or upload** a PDF / photo / text, choose a matter. A paper on the file can send its text here via **Read as order**.
2. `extractOrder` (AI). Directions vs suggested tasks are separate arrays in the prompt **and** the schema.
3. Save document + **unconfirmed** order.
4. Lawyer reviews chips (court vs AI).
5. **Confirm** (`confirmOrder`): directions → court-origin tasks/deadlines; optional AI suggestions → `ai_suggestion` tasks; optional next hearing; optional stage update.
6. **Reject** drops the pending order.

Unconfirmed orders also appear on Today until handled.

## Hearing brief

`prepareHearingBrief(matterId)` reads the bundle (no web search): last hearing, last confirmed order, open tasks, deadlines, stage meaning. Returns JSON (purpose, last order, positions, issues, documents, authorities mentioned in the file, open items, expected next, caveats). Gated like other AI.

## Draft from a task or deadline

Open items on Today and on the matter record that look like a filing get **Draft this** (`draftForWork`).

`classifyTaskDraft(title, sourceQuote)` (`src/lib/practice/task-draft-class.ts`):

| Draftable kinds | Left for the lawyer |
|---|---|
| written statement, reply, notice, petition, application, affidavit, court note | Gather / diary / appearance / “compile the papers” |

The draft is built from the **file only** (notes, last order, parties, papers on file). No `web_search`. Chat Completions JSON, 45s abort, model `grok-4.20-0309-non-reasoning`. Saved as `matter_documents` with `source_kind = ai_draft` and a timeline event (`ai_suggestion`). Sample chamber uses `draftFromBundle` if the model is down. The lawyer still marks the task done — the draft does not close the item.

This is not `draftLetter`. Memo letters reuse stamped cites. From a matter they also save as papers. Standalone desk drafts stay on screen. Task drafts do not load a memo.

## Research and statutes on the file

Memos saved from `/research?matter=<id>` list on the matter. Their statutes are de-duplicated into a map on the same record. Notice / reply / petition / written statement drafted from that desk are stored as papers (`ai_draft`). Copy and Word work on those papers.

## Sample chamber

`buildSampleChamber()` in `src/lib/practice/sample.ts` seeds three files:

1. **Sharma v Apex Traders Pvt Ltd** — Delhi commercial recovery, WS / 120-day problem  
2. **State v Rakesh Kumar** — criminal bail  
3. **Mehta v State of Rajasthan** — writ  

Detection (`looksLikeSample` / `isSampleMatter`): exact titles or case numbers `CS (COMM) 412/2026`, `Bail 88/2026`, `CWP 2104/2026`, or facts containing `Matter: <sample title>`.

`gateAi(..., { demo: true })` when the work looks like sample — **no entitlement row**, trial stays idle.

**Load sample** replaces the previous sample pack for that user. **Exit sample** deletes leftover demo rows. Own matters are not deleted.

## Today board

`getTodayBoard` aggregates for the user: hearings today, upcoming, open deadlines, open tasks, unconfirmed orders, stale matters, `sampleLoaded` flag, counts. The home page is this board plus Load sample. Draftable tasks and deadlines also show **Draft this**, which jumps to `/matters/$id#<itemId>`.

## Diary buckets

`listHearingsRange` feeds `/diary`. Rows split into today / upcoming / earlier. Each `Link` carries the hearing id as a hash so the file opens that listing.

## Trust in the file

Never copy `suggestedTasks` into `directions`. Never mark an AI row `court_direction`. The UI uses `TrustChip`. Copy in `src/lib/practice/copy.ts` (hi + en) is the source of labels — add both languages together.
