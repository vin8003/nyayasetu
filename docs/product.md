# Product tour

CiteBench is the lawyer’s chamber: **what is listed today**, **what the file says**, **what the court ordered**, and **what the law is**. Hindi and English share the same data; only labels and model output language change.

This is **not legal advice**. The footer on memos and drafts says so. Court dates and citations must be checked on the original record.

## Sign-in

`/login`

- Google and X (federated)
- Username / email + password (register once; password ≥ 8 characters)

Guests see a short pitch on Today, can open **Research**, and can read the public first-day article at **`/story`**. Chamber data and AI are behind an account.

Language toggle: **हि** / **EN** in the header (stored as chamber language). On a narrow screen the wordmark hides, sign-out is an icon, and the five chamber surfaces sit in a tab bar.

## Today — `/`

The board for the logged-in user:

- Hearings **today** and **upcoming**
- Open **deadlines** and **tasks**. Items that look like a filing get **Draft this**, which opens the matter record.
- **Unconfirmed orders** (from Inbox; still waiting for a human)
- **Stale matters** (active files that have gone quiet)

Empty desk: create a matter, or **Load sample chamber**.

The sample banner is explicit: the three demo files are **free** and **do not start the trial**. Exit sample purges those demo rows and leaves a Load control on Today.

After you open a listing and come back, the board stays where you left it.

## Diary — `/diary`

Hearings in three buckets: **today**, **upcoming**, and earlier listings. Each row opens that listing on the matter (`/matters/$id#<hearingId>`). Empty copy: nothing listed yet.

On a phone the listing is a sheet with **Back**. If you arrived from the diary, Back returns you there, at the same scroll offset.

## Matters — `/matters` and `/matters/$id`

**List:** title, court, case number, stage, next hearing, status (active / stayed / dormant / closed). New matter form: client, proceeding type, court, CNR, our side, parties.

**Record** is the case file. A row opens a sheet (not a new page). The sheet has **← Back** above the title. Opening a row in-page does not rewrite the URL hash; a hash from Diary or Today is how you landed on that item.

- Caption, stage checklist (from the proceeding workflow), typical documents and deadlines. **Edit file** to change particulars, parties, status and notes.
- What the lawyer does vs what the court does at this stage
- What AI **may** help with vs what a **human must decide**
- Hearings (add listing, outcome, next date) — open a listing to correct date, purpose or what the court said
- Documents and pasted orders — paste or upload PDF / photo / text on the file. Open a paper or order to edit it. **Read as order** sends a paper to Inbox.
- Tasks and deadlines, each tagged with an **origin** (court / AI / lawyer / statute / system). Open an item to change the title or due date. Open items that need a filing get **Draft this** — written statement, affidavit, application, petition, or a court note — saved on the papers. Appearance / gather work is left for the lawyer.
- Timeline — open an event to correct the date or note
- **Hearing brief** (AI, gated) — a structured note from the file, not a new search
- **Research from this matter** — opens `/research?matter=<id>` with facts and issues prefilled from the file. Saved memos and their statutes show on the record.
- Copy / Word on papers and AI drafts.

Origins stay visible as chips. A CiteBench suggestion is never relabelled as a court direction.

## Research — `/research`

The original NyayaSetu desk, now a chamber tab.

1. Paste facts (and optional legal question). Pick forum, practice area, side, language.
2. Optionally attach up to three files: images (OCR), text-layer PDFs, plain text. Scanned image-only PDFs are still weak.
3. Run research → structured memo (issues, statutes, doctrines, precedents with verified flags, arguments both ways, risks).
4. Save to **Past memos** (per account). Research run from a matter is stored on that file. Search by cause title, party, court, or a phrase from the facts. Follow-ups stay grouped under the parent.
5. **Follow-up** on the memo: another issue or “what if” — same facts and verified cites, saved as a new memo, not an overwrite.
6. From the memo toolbar: **Notice**, **Reply**, **Petition**, or **Written statement**. Same language as the memo. Drafts reuse only verified cites. If the desk was opened from a matter, the draft is also saved on the papers.

Sample-matter facts do not start the trial clock. Your own facts do.

## Inbox — `/inbox`

Paste order or notice text, or upload a PDF / photo, pick a matter, **Read order**.

The model returns:

- A summary of what the court **actually** ordered
- Next hearing (only if a real `YYYY-MM-DD` is in the extract)
- **Directions** (court only)
- **Suggested tasks** (CiteBench, never mixed into directions)
- Optional stage hint and caveats

Nothing hits the diary until you **Confirm**. Reject discards the pending extract.

## Billing — `/billing`

30 days on your own AI use, then ₹500 / month. Sample chamber does not count. Subscribe / cancel is recorded on the account; live card charge is not wired. See [billing.md](billing.md).

## On a phone

Below 900px the five surfaces are a tab bar (Today · Diary · Matters · Research · Inbox), not the desktop nav. The bar is opaque and stays above the page. Hindi labels wrap rather than clip. Sample actions on Today stack so a long Hindi string is still tappable.

A listing, paper, task or event opens as a sheet **above** the header and the tab bar. **← Back** is the first control on that sheet. Closing it does not jump the list to the top.

## Languages

| Surface | Language |
|---|---|
| Shell, Today, Diary, Matters, Inbox, Billing | Chamber language (`hi` / `en`) |
| Research memo and court drafts | Memo language from intake (the desk passes it through) |
| `/story` | Toggle on the article (`?lang=hi` for Hindi) |
| Case names, citations, statute names in Hindi drafts | Kept in English by prompt |

## What CiteBench will not do

- File on eCourts or CIS
- Fetch Indian Kanoon HTML to “prove” a cite
- Treat a model `verified: true` as truth
- Bill a card in this preview
