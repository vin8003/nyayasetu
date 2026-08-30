# Product tour

CiteBench is the lawyer’s chamber: **what is listed today**, **what the file says**, **what the court ordered**, and **what the law is**. Hindi and English share the same data; only labels and model output language change.

This is **not legal advice**. The footer on memos and drafts says so. Court dates and citations must be checked on the original record.

## Sign-in

`/login`

- Google and X (federated)
- Username / email + password (register once; password ≥ 8 characters)

Guests see a short pitch on Today and can open **Research**, but chamber data and AI are behind an account.

Language toggle: **हि** / **EN** in the header (stored as chamber language).

## Today — `/`

The board for the logged-in user:

- Hearings **today** and **upcoming**
- Open **deadlines** and **tasks**
- **Unconfirmed orders** (from Inbox; still waiting for a human)
- **Stale matters** (active files that have gone quiet)

Empty desk: create a matter, or **Load sample chamber**.

The sample banner is explicit: the three demo files are **free** and **do not start the trial**. Exit sample purges those demo rows and leaves a Load control on Today.

## Diary — `/diary`

A date-ordered list of hearings. Each row links to `/matters/$id`. Empty copy: nothing listed yet.

## Matters — `/matters` and `/matters/$id`

**List:** title, court, case number, stage, next hearing, status (active / stayed / dormant / closed). New matter form: client, proceeding type, court, CNR, our side, parties.

**Record** is the case file:

- Caption, stage checklist (from the proceeding workflow), typical documents and deadlines
- What the lawyer does vs what the court does at this stage
- What AI **may** help with vs what a **human must decide**
- Hearings (add listing, outcome, next date)
- Documents and pasted orders
- Tasks and deadlines, each tagged with an **origin** (court / AI / lawyer / statute / system)
- Timeline
- **Hearing brief** (AI, gated) — a structured note from the file, not a new search
- **Research from this matter** — opens `/research?matter=<id>` with facts and issues prefilled from the file

Origins stay visible as chips. A CiteBench suggestion is never relabelled as a court direction.

## Research — `/research`

The original NyayaSetu desk, now a chamber tab.

1. Paste facts (and optional legal question). Pick forum, practice area, side, language.
2. Optionally attach up to three files: images (OCR), text-layer PDFs, plain text. Scanned image-only PDFs are still weak.
3. Run research → structured memo (issues, statutes, doctrines, precedents with verified flags, arguments both ways, risks).
4. Save to **Past memos** (per account). Search by cause title, party, court, or a phrase from the facts. Follow-ups stay grouped under the parent. Memos are stored; court drafts are not.
5. **Follow-up** on the memo: another issue or “what if” — same facts and verified cites, saved as a new memo, not an overwrite.
6. From the memo toolbar: **Notice**, **Reply**, **Petition**, or **Written statement**. Same language as the memo. Drafts reuse only verified cites.

Sample-matter facts do not start the trial clock. Your own facts do.

## Inbox — `/inbox`

Paste order or notice text, pick a matter, **Read order**.

The model returns:

- A summary of what the court **actually** ordered
- Next hearing (only if a real `YYYY-MM-DD` is in the extract)
- **Directions** (court only)
- **Suggested tasks** (CiteBench, never mixed into directions)
- Optional stage hint and caveats

Nothing hits the diary until you **Confirm**. Reject discards the pending extract.

## Billing — `/billing`

30 days on your own AI use, then ₹500 / month. Sample chamber does not count. Subscribe / cancel is recorded on the account; live card charge is not wired. See [billing.md](billing.md).

## Languages

| Surface | Language |
|---|---|
| Shell, Today, Diary, Matters, Inbox, Billing | Chamber language (`hi` / `en`) |
| Research memo and court drafts | Memo language from intake (the desk passes it through) |
| Case names, citations, statute names in Hindi drafts | Kept in English by prompt |

## What CiteBench will not do

- File on eCourts or CIS
- Fetch Indian Kanoon HTML to “prove” a cite
- Treat a model `verified: true` as truth
- Persist notice / reply / petition to the database
- Bill a card in this preview
