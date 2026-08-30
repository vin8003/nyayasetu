# Research desk and court drafts

The research desk is `/research` (`src/components/research-desk.tsx`). It is the same pipeline that used to live on `/` when the product was named NyayaSetu.

## Intake

Fields (`src/lib/research/types.ts`):

- Facts (required for a useful memo)
- Optional legal question
- Forum (`COURTS` in `src/lib/research/courts.ts` — Supreme Court, High Courts, NCLAT/NCLT, ITAT, CAT, or “all”)
- Practice area, side (petitioner / respondent / neutral), language (`en` / `hi`)

From a matter, `intakeFromMatter` fills facts, question, court id (name heuristics), area (from proceeding), and side. Query param: `/research?matter=<id>`.

Uploads (`extractUploads`, max 3 files):

| Kind | Behaviour |
|---|---|
| Image | xAI chat OCR (`grok-4.20-0309-non-reasoning`) |
| PDF | `unpdf` text extract (text layer). Image-only scans usually come back empty |
| Text-like | UTF-8 decode |

OCR is paywalled like other AI (`gateAi`). Missing `XAI_API_KEY` returns a placeholder line rather than throwing.

## Memo generation

`runResearch`:

- Auth + `gateAi` (sample facts skip the trial insert)
- User prompt: language, forum (always search SC if the forum is not SC), area, side, question, facts
- xAI **Responses** API with `web_search` restricted to `LEGAL_DOMAINS`
- `temperature: 0.2`, 12k output tokens, 90s abort, `json_object`
- `parseResearchMemo` — empty or heading-only JSON is rejected (`PARSE`)
- `stampPrecedents` overwrites `verified`

Memo shape (high level): title, cause title, courts consulted, facts summary, issues, statutes, doctrines, precedents, points for court, arguments for/against, counters, strategy, risks, full memo, sources, unverified list, searched queries, citation URLs.

Saved memos: `memos` table (`user_id`, `intake_json`, `memo_json`, `parent_id`, `matter_id`). Research from `/research?matter=` writes `matter_id`. Follow-ups inherit it. Drafts of letters from a matter are saved as `matter_documents` (`source_kind = ai_draft`). Standalone desk drafts stay session-only.

Past memos (`listMemos`): last **80** for the user when unfiltered; a search (`q`, min useful length 2) seeds **40** matches on `title` / `intake_json` / `memo_json` then hydrates parent and child rows so a hit is not shown without its thread. Client-side `threadsMatchingQuery` / `groupMemoHistory` (`src/lib/research/history-search.ts`) nest follow-ups under the original memo (newest thread first). An orphan follow-up (missing parent) stays its own root.

## Follow-up Q&A

`runFollowUp` (`src/lib/research/follow-up.ts`):

- Same auth + `gateAi` as research (sample facts skip the trial insert)
- Question: 8–2000 characters
- `followUpIntake` keeps facts, forum, side, and language; replaces the legal question
- xAI Responses + `web_search` on `LEGAL_DOMAINS` (max 3 tool calls) — **not** a no-tools letter call
- Same timeout and token budget as `runResearch` (90s, 12k)
- `stampPrecedents` on the **union** of this run’s retrieved URLs and the parent memo’s `citationUrls` / precedent URLs, so a reused parent cite can stay verified
- Save inserts a **new** row with `parent_id` set. The parent memo is never updated.

## Court drafts

`LETTER_KINDS = ["notice", "reply", "petition", "writtenStatement"]`.

`draftLetter` shares one handler (`z.enum(LETTER_KINDS)`). Language is the **memo** language.

| Kind | Shape (`letterChrome`) |
|---|---|
| Notice | Demand + time to comply. No without-prejudice. No verification. |
| Reply | Without prejudice, para-wise reply, stand taken. No demand, no time to comply, no verification. |
| Petition | Grounds, prayer, optional interim, verification clause. |
| Written statement | Para-wise reply grounds, optional preliminary objections first (`followOnFirst`), prayer to dismiss/contest, verification. |

`assembleLetter` keeps `verification` when `letterChrome` has a verification heading — **petition and written statement**. Notice and reply force it to empty even if the model emitted a clause.

Prompt (`LETTER_SYSTEM` + `kindLine`): no tools, cite only the verified list, keep case names in English in Hindi output. User message includes forum name (unless intake is “all courts”), cause title, side, practice area, and memo statutes (blank statute rows are skipped).

After parse: `filterLetterGrounds` + `scrubUnverifiedText`. `LetterView` renders chrome headings; ground URLs use `httpHref`. Copy / print / Word HTML (`formatLegalLetterHtml`) use the same formatted text.

From a matter, these drafts also save as `matter_documents`. Standalone desk drafts stay in client state. **Draft this** on a chamber task is file-only — see [practice-chamber.md](practice-chamber.md).

## Models (as of this tree)

| Job | API | Model |
|---|---|---|
| Research memo | Responses + `web_search` | `grok-4.20-0309-non-reasoning` |
| Follow-up memo | Responses + `web_search` | `grok-4.20-0309-non-reasoning` |
| Notice / reply / petition / written statement | Responses, no tools | `grok-4.20-0309-non-reasoning` |
| Image OCR | Chat Completions | `grok-4.20-0309-non-reasoning` |
| Draft this (task / deadline) | Chat Completions, no search | `grok-4.20-0309-non-reasoning` |
| Order extract, hearing brief | Chat Completions | `grok-4.5` |

## Error strings the UI maps

- `PAYWALL` — trial ended; send the user to `/billing`
- `AI_UNAVAILABLE` — no key or upstream failure
- `PARSE` — model did not return a usable JSON object
- `TIMEOUT` — abort fired

## Tests

`src/lib/research/*.test.ts` covers parse fail-closed, stamp, letter chrome (including written statement), cite filter, letter budget (no `tools` key), prompt kind-lines, follow-up intake/prompt, and history search grouping.
