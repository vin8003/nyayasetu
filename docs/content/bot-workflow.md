# Bot-autonomous content workflow

English only. Designed so a bot can run the queue without guessing.

Notion Calendar: https://app.notion.com/p/3ff4d2ce24974c32a8a528aefab436cd  
Data source: `collection://8487b4bc-cbe1-4d7c-8727-7b5cff55d505`

Human still owns legal risk. Bot never invents metrics or claim levels.

---

## 1. State machine

```text
Idea
  → Draft          (body being written)
  → Ready          (Exact paste final; Char count set; Language=EN)
  → Needs approval (optional hold)
  → Posted         (Posted URL filled) | Killed
```

Status (coarse): Not started | In progress | Done  
Pipeline (fine): Idea | Draft | Ready | Needs approval | Posted | Killed

**Transition rules**
| From | To | Who | Condition |
|---|---|---|---|
| Idea | Draft | Bot or human | Name + Channel + Claim level set |
| Draft | Ready | Bot or human | Exact paste non-empty; Language=EN; Char count; Preflight OK |
| Ready | Needs approval | Bot | Claim level in {CLAIM, VISION, SAMPLE ONLY} OR Channel in {Outreach email, Personal message} |
| Ready | Posted | Bot | Bot mode=`Bot may post` AND Approved AND Preflight OK AND Claim=CONFIRMED AND Channel in {X, Marketing, Article, Reply} |
| Ready | Posted | Human | Approved AND Preflight OK (any allowed claim with label) |
| * | Killed | Human | Policy violation or obsolete |

---

## 2. Field contract (machine-readable)

| Field | Required for Ready | Bot meaning |
|---|---|---|
| Name | yes | Stable title; prefer `PB-*` id in Repo mirror |
| Channel | yes | Where to publish |
| Claim level | yes | CONFIRMED / CLAIM / VISION / SAMPLE ONLY / `[need number]` |
| Language | yes | Must be `EN` |
| Exact paste | yes | **Literal text to post** (no markdown wrappers) |
| Char count | yes for X | Length of Exact paste |
| CTA / link | recommended | Primary URL |
| Approved | yes to post | Vineet/human yes |
| Preflight OK | yes to post | Checklist passed |
| Bot mode | yes | Human only / Queue for bot / Bot may draft / Bot may post |
| Pipeline | yes | Lifecycle |
| Scheduled | optional | Prefer post on/after this date |
| Posted URL | set after post | Proof |
| Repo mirror | recommended | Path under `docs/content/` |
| Angle / Body / Notes | optional | Body may duplicate Exact paste; Exact paste wins |

---

## 3. Preflight checklist (set Preflight OK)

Bot/human must verify all true:

1. Language is EN  
2. Exact paste has no Hindi script  
3. Claim level matches content (VISION posts say *Building toward* / *Not shipped* in first 2 lines)  
4. No `[need number]` filled with a guessed number  
5. No claim that card payments are live, eCourts filing exists, or cites are court-verified HTML  
6. Product not called NyayaSetu (repo name only as historical footnote)  
7. Product claims include “Not legal advice” when describing what CiteBench does for lawyers  
8. X posts: Char count ≤ 280 (per post; threads are separate rows or clearly delimited `---` parts)  
9. CTA / link is https and public (citebench / github / story)  
10. SAMPLE ONLY rows are never Bot may post  

If any fail → Preflight OK = false; Pipeline stays Draft or Needs approval.

---

## 4. Bot modes

| Bot mode | Allowed actions |
|---|---|
| Human only | No autonomous post or send |
| Queue for bot | Bot may list, validate, remind; no publish |
| Bot may draft | Bot may fill Exact paste from paste-bank IDs; cannot publish |
| Bot may post | Bot may publish to allowed channels after Approved + Preflight |

**Default for new rows:** Human only.  
**Default for outreach / DM:** Human only (even if CONFIRMED).  
**Default for VISION / CLAIM / SAMPLE ONLY:** Human only or Queue for bot.

---

## 5. Autonomous loop (pseudocode)

```text
every N minutes OR on schedule:
  rows = query Calendar where
      Language = 'EN'
      AND Pipeline = 'Ready'
      AND Approved = __YES__
      AND Preflight OK = __YES__
      AND Bot mode = 'Bot may post'
      AND "Claim level" = 'CONFIRMED'
      AND Channel IN ('X','Marketing','Article','Reply')
      AND (Scheduled IS NULL OR Scheduled <= today)

  for row in rows ordered by Scheduled ASC, Post ID ASC:
      if channel == X and Char count > 280: mark Needs approval; skip
      if Exact paste empty: mark Draft; skip
      publish Exact paste to Channel with CTA / link as needed
      set Pipeline = Posted
      set Status = Done
      set Posted URL = result url
      write Bot notes = "posted by bot at <iso time>"
```

**Draft refill loop**

```text
for each paste-bank ID listed in marketing-plan campaign table:
  if no Calendar row with Repo mirror containing that ID:
      create row:
        Name = ID + short title
        Exact paste = body from paste-bank
        Language = EN
        Claim level / Channel / Campaign from bank metadata
        Pipeline = Draft
        Bot mode = Queue for bot (or Bot may draft)
```

**Never autonomous**
- Changing Claim level upward (e.g. VISION → CONFIRMED)
- Inventing metrics
- Sending outreach email / personal DM unless Bot may post explicitly (default off)
- Posting SAMPLE ONLY or unlabeled VISION

---

## 6. Suggested SQL (Notion query tool)

Ready-to-post queue:

```sql
SELECT Name, Channel, "Claim level", "Exact paste", "Char count", "CTA / link", Scheduled
FROM "collection://8487b4bc-cbe1-4d7c-8727-7b5cff55d505"
WHERE Language = 'EN'
  AND Pipeline = 'Ready'
  AND Approved = '__YES__'
  AND "Preflight OK" = '__YES__'
  AND "Bot mode" = 'Bot may post'
  AND "Claim level" = 'CONFIRMED'
ORDER BY "date:Scheduled:start" ASC
LIMIT 20
```

Needs human:

```sql
SELECT Name, Channel, "Claim level", Pipeline, "Bot mode"
FROM "collection://8487b4bc-cbe1-4d7c-8727-7b5cff55d505"
WHERE Pipeline IN ('Ready','Needs approval')
  AND (
    Approved = '__NO__' OR Approved IS NULL
    OR "Preflight OK" = '__NO__' OR "Preflight OK" IS NULL
    OR "Claim level" IN ('CLAIM','VISION','SAMPLE ONLY','[need number]')
    OR "Bot mode" IN ('Human only','Queue for bot','Bot may draft')
  )
LIMIT 50
```

---

## 7. Channel adapters (what “publish” means)

| Channel | Publish action | Exact paste format |
|---|---|---|
| X | Post status (or thread if body contains `---` part markers) | Plain text |
| Article | Share link post pointing at `/story` | Plain text including URL |
| Marketing | Update bio/blurb surfaces OR queue LinkedIn text | Plain text |
| Reply | Reply to matched trigger thread | Plain text |
| WhatsApp status | **Human posts** unless Status API wired | Plain text |
| Personal message | **Human sends** by default | Plain text with `{Name}` replaced |
| Outreach email | **Human sends** by default; subject line = first line `Subject: ...` | Email plain text |

Thread convention for X: separate calendar rows per tweet preferred. If one row holds a thread, parts are separated by a line containing only `---`.

---

## 8. Incident / kill switch

- Set Bot mode globally by flipping all `Bot may post` → `Queue for bot` if a bad post ships.
- Move offending row to Killed; add Notes.
- Do not delete evidence rows.

---

## 9. Sync with repo

After Pipeline=Posted or paste-bank change:
1. Update `docs/content/paste-bank.md` if new evergreen copy
2. Update `docs/content/calendar.md` index
3. Commit on content branch

Dual home: Notion = runtime queue; repo = durable mirror.
