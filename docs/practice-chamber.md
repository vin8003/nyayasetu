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
- **Document** — pasted body (orders, notes)
- **Order** — body + `directions_json` + `confirmed`
- **Task / deadline** — title, due, **origin**, source quote
- **Timeline event** — what happened, origin, optional ref

All rows are `user_id`-scoped. Deletes cascade from matter where the FK is set.

## Inbox confirm path

1. Paste ≥ 40 characters of order text, choose a matter.
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

This is not `draftLetter`. Memo letters reuse stamped cites and stay on screen. Task drafts do not load a memo.

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

## Trust in the file

Never copy `suggestedTasks` into `directions`. Never mark an AI row `court_direction`. The UI uses `TrustChip`. Copy in `src/lib/practice/copy.ts` (hi + en) is the source of labels — add both languages together.
