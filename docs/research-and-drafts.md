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

Saved memos: `memos` table (`user_id`, `intake_json`, `memo_json`). `matter_id` exists on the table (`0003_practice.sql`) but save/list in `research/store.ts` do not write it yet. Drafts of letters are **not** stored.

Past memos: last 80 for the user, searchable (`listMemos` `q` — title, intake JSON, memo JSON). Follow-ups stay grouped under the original memo. Follow-up (`runFollowUp`) asks a new question against the same facts and verified cites, searches the same Indian hosts, and **saves a new row** with `parent_id` — it does not overwrite. Citation URLs from the parent stay in the union so a reused cite can remain verified.

## Court drafts

`LETTER_KINDS = ["notice", "reply", "petition", "writtenStatement"]`.

`draftLetter` shares one handler (`z.enum(LETTER_KINDS)`). Language is the **memo** language.

| Kind | Shape (`letterChrome`) |
|---|---|
| Notice | Demand + time to comply. No without-prejudice. No verification. |
| Reply | Without prejudice, para-wise reply, stand taken. No demand, no time to comply, no verification. |
| Petition | Grounds, prayer, optional interim, verification clause. |

`assembleLetter` keeps `verification` only for petition (`kind === "petition"`). Notice and reply force it to empty even if the model emitted a clause.

Prompt (`LETTER_SYSTEM` + `kindLine`): no tools, cite only the verified list, keep case names in English in Hindi output. User message currently includes side and practice area (`Forum / side: …`); forum name and memo statutes are **not** yet injected on `main`.

After parse: `filterLetterGrounds` + `scrubUnverifiedText`. `LetterView` renders chrome headings; ground URLs use `httpHref`. Copy / print / Word HTML (`formatLegalLetterHtml`) use the same formatted text.

## Models (as of this tree)

| Job | API | Model |
|---|---|---|
| Research memo | Responses + `web_search` | `grok-4.20-0309-non-reasoning` |
| Notice / reply / petition | Responses, no tools | `grok-4.20-0309-non-reasoning` |
| Image OCR | Chat Completions | `grok-4.20-0309-non-reasoning` |
| Order extract, hearing brief | Chat Completions | `grok-4.5` |

## Error strings the UI maps

- `PAYWALL` — trial ended; send the user to `/billing`
- `AI_UNAVAILABLE` — no key or upstream failure
- `PARSE` — model did not return a usable JSON object
- `TIMEOUT` — abort fired

## Tests

`src/lib/research/*.test.ts` covers parse fail-closed, stamp, letter chrome, cite filter, letter budget (no `tools` key), and prompt kind-lines (petition must not contain “time to comply”; reply must contain that phrase as a **prohibition**).
