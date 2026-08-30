# From a research desk to a chamber — in less than a day

**29–30 August 2026.** First commit to a live CiteBench chamber: under sixteen hours.

This is not a launch manifesto. It is a record of what shipped, in order, so a tweet does not have to lie.

---

Yesterday evening CiteBench (then still named NyayaSetu) did one job well: an advocate pasted facts, picked a forum and a side, and got a research memo — issues, doctrines, arguments both ways, Hindi or English.

That was the whole product. A desk. Sign in with Google, X, or a password. Search Indian Kanoon, LiveLaw, CaseMine, eSCR, and the Supreme Court site. Not legal advice. Verify the cites yourself.

The gap was obvious the moment the memo landed. A working lawyer does not live in a research pane. They live in **what is listed tomorrow**, **what the last order actually said**, and **whether the case on the page is real**.

So we kept building.

## What “verified” means here

The first merge was not a new screen. It was a gate.

A precedent is verified only if its `http(s)` URL was actually retrieved, and only if the host is on a short allowlist. The model’s own `verified: true` is overwritten. `javascript:` links die. Invented names are stripped out of a draft before it hits the screen.

Court drafts — notice, reply, petition — do not search the web at all. They may cite only what the memo already proved. A legal proposition with no case is kept; a fake *Invented v. Case* is not.

That rule is the product. The chamber is furniture around it.

## What exists this morning

| Last night | This morning |
|---|---|
| Paste facts → memo | Same desk, plus **Notice / Reply / Petition** from that memo |
| Citations the model claimed | Citations the **search actually retrieved** |
| One research page | **Today, Diary, Matters, Research, Inbox** |
| — | Paste an order; AI extracts directions; **you confirm** before the diary moves |
| — | Court directions and CiteBench suggestions stay different colours |
| — | Three-matter **sample chamber**, free, does not start the trial |
| — | 30 days on your own work, then ₹500 / month (card not live yet) |
| NyayaSetu | **CiteBench** |

The sample file is a Delhi commercial recovery, a bail, and a Rajasthan writ. Load it, click around, throw it away. Your own research is what starts the clock.

## What we did not ship

- A bot that files on eCourts
- Cites “verified” by fetching Indian Kanoon HTML
- Mixing “you should apply for X” into “the court directed X”
- Saving notice/reply/petition into the database (still a first-cut on screen)
- Charging a card

Written statement from the memo is on a branch. It is not on `main` yet, so it is not in this story.

## Why speed is the wrong headline

Sixteen hours is a curiosity. The useful sentence is: **the memo, the listing, and the order now sit in one place, and the software refuses to flatter a fake judgment.**

If you are an advocate: sign in, load the sample, then try your own facts. Check every date and every URL on the original record before you file.

If you are a builder: the interesting file is not the hero copy. It is `stampPrecedents`.

Not legal advice. Never was.

— CiteBench, 30 August 2026
