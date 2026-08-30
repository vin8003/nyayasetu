# CiteBench marketing plan (English only)

**Language policy:** All public docs and posts are **English only**. Do not draft Hindi for marketing surfaces.

**Authority:** Live product facts from README / Source of truth. Future from the [PRODUCT & DISCOVERY PLAN](https://app.notion.com/p/3ccf4949ea1481728918eca26fa21637) — label **VISION**. Never invent metrics (`[need number]`).

**Posting gate:** Voice / bot does not publish unless `Approved = yes` **and** `Preflight OK = yes` **and** Claim level is allowed for that Bot mode (see [bot-workflow.md](bot-workflow.md)).

Companion files:
- [paste-bank.md](paste-bank.md) — copy-paste bodies
- [bot-workflow.md](bot-workflow.md) — autonomous queue rules
- [voice-and-claims.md](voice-and-claims.md) — claim levels
- [format-guides.md](format-guides.md) — channel rules
- Notion Calendar: https://app.notion.com/p/3ff4d2ce24974c32a8a528aefab436cd

---

## 1. Product truth (what we sell today)

CiteBench is a **practice assistant for Indian advocates**: court diary, matter files, order inbox, and an Indian case-law research desk in one chamber.

Live URL: https://citebench.ordereasy.win  
Story: https://citebench.ordereasy.win/story  
Repo (historical name): https://github.com/vin8003/nyayasetu

| Surface | Promise |
|---|---|
| Today | Hearings, deadlines, tasks, unconfirmed orders, stale matters |
| Diary | Listings in today / upcoming / earlier |
| Matters | Client files: stage, hearings, papers, timeline, hearing brief |
| Research | Facts in → memo → follow-up → notice / reply / petition / written statement |
| Inbox | Paste/upload an order; model extracts; **lawyer confirms** |

**Trust rules (must appear in trust campaigns):**
1. Research search is allowlisted (Indian Kanoon, LiveLaw, CaseMine, eSCR, SCI).
2. A cite is “verified” only if an http(s) URL was retrieved **and** the host is allowlisted.
3. Court directions and CiteBench suggestions stay separate until a human confirms.
4. Not legal advice. Check the original record before filing.

**Pricing honesty:** Sample chamber is free and does not start the trial. Trial starts on your own AI work — 30 days, then ₹500/month (GST extra). **Card collection is not live yet.**

**Not CiteBench:** GoI Nyaya Setu chatbot · MHA/NIC police dashboard · eCourts filing bot · “AI lawyer.”

---

## 2. Strategic goal

Make CiteBench the default **chamber tool** Indian advocates try when they want diary + matters + citation-gated research — without confusing it with government Nyaya Setu or “AI legal advice” products.

Near-term outcomes (no invented counts):
- Advocates can explain what CiteBench is in one sentence (chamber, not chatbot).
- Trust questions (“would you trust this memo?”) get real replies.
- Sample chamber is the default try path.
- Zero public posts that claim payments live, eCourts filing, or court-verified HTML.

---

## 3. Positioning

| | |
|---|---|
| **Category** | Lawyer practice assistant (India) |
| **For** | Practising advocates and chambers |
| **Job** | Keep the file, diary, orders, and authorities in one place |
| **Unlike** | Citizen chatbots, pure search engines, generic AI writers |
| **Proof** | Citation gate + human confirm on orders + five live surfaces |
| **Tone** | Direct, chamber-floor English, no hype metrics |

**One-liner (CONFIRMED):**  
CiteBench is a practice assistant for Indian advocates: court diary, matter files, order inbox, and case-law research in one chamber.

**Anti-one-liner (never use):**  
“AI lawyer that files your cases.”

---

## 4. Audiences & messages

### A. Practising advocates (primary)
- **Job:** Survive today’s list and prepare the next hearing.
- **Message:** Diary + matters + inbox + research in one chamber.
- **CTA:** Open sample chamber / try Research / read `/story`.
- **Proof:** Five surfaces; you confirm orders; verified = retrieved.

### B. Senior advocates / chamber leads
- **Job:** Supervise juniors; reduce citation risk.
- **Message:** Model cannot tick its own verification box; drafts reuse only gated cites.
- **CTA:** “What would make a memo safe enough to hand upstairs?”
- **Proof:** Trust thread + allowlist story.

### C. Juniors
- **Job:** Research and first drafts fast without inventing authorities.
- **Message:** Facts in → memo → notice/reply/petition/WS; invented names stripped.
- **CTA:** Sample chamber; save memos on the file when run from a matter.

### D. Builders / build-in-public
- **Job:** Watch how a chamber product ships.
- **Message:** Repo still `nyayasetu`; app is CiteBench; trust rules > stopwatch.
- **CTA:** GitHub + `/story`. Phone/speed stays **CLAIM**.

### E. Press / partners
- **Job:** Name hygiene.
- **Message:** CiteBench ≠ GoI Nyaya Setu; repo name is historical.
- **CTA:** Live URL + rename clarification email.

---

## 5. Funnel

```text
Awareness (X, WhatsApp, /story, outreach)
    → Distinction (not GoI Nyaya Setu; not AI lawyer)
    → Trust (citation gate + human confirm)
    → Try (sample chamber — free, no trial clock)
    → Feedback (lawyer discovery asks)
    → Habit (own matters / research)
    → Paid chamber (ONLY after card is live — not yet)
```

Do **not** run “subscribe now” CTAs while card collection is offline. Soft CTA: try sample / send feedback.

---

## 6. Campaign architecture (90-day spine)

Run campaigns in parallel; sequence *emphasis*, not exclusivity.

| Week focus | Campaign | Primary channels | Claim level |
|---|---|---|---|
| 1 | Chamber launch | X, WhatsApp, Article share | CONFIRMED |
| 1–2 | Rename hygiene | X, Reply, Outreach email | CONFIRMED / SAMPLE rewrite |
| 2–3 | Trust rules | X thread, Marketing blurb | CONFIRMED |
| 3–ongoing | Lawyer discovery | X ask, DM, Outreach | CONFIRMED |
| Ongoing | Build in public | X | CLAIM (phone) / CONFIRMED (git) |
| After live is clear | Vision tease | X (rare) | VISION only |
| Ongoing | Outreach | Email, Personal message | CONFIRMED |

### Campaign briefs

#### C1 — Chamber launch
- **Objective:** Name the five surfaces.
- **Hero proof:** Today / Diary / Matters / Research / Inbox.
- **Do not say:** Full proceeding engine, morning command centre as shipped.
- **Paste IDs:** `PB-X-01`, `PB-X-02`, `PB-WA-01`, `PB-ART-01`, `PB-MKT-01`

#### C2 — Rename
- **Objective:** Kill GoI brand confusion.
- **Hero proof:** doj.gov.in exists; CiteBench is a private chamber.
- **Do not say:** Play Store download counts; “we are official.”
- **Paste IDs:** `PB-X-03`, `PB-RPL-01`, `PB-EM-03`

#### C3 — Trust rules
- **Objective:** Verified = retrieved + allowlisted.
- **Hero proof:** `stampPrecedents` / allowlist hosts.
- **Do not say:** Court-verified HTML; we scrape Indian Kanoon.
- **Paste IDs:** `PB-X-02`, `PB-MKT-01`, `PB-EM-02`

#### C4 — Lawyer discovery
- **Objective:** Collect trust objections.
- **Hero proof:** Honest ask; sample chamber offer.
- **Do not say:** “Try our AI lawyer.”
- **Paste IDs:** `PB-X-04`, `PB-DM-01`, `PB-EM-01`

#### C5 — Build in public
- **Objective:** Show shipping culture without stopwatch as the product.
- **Hero proof:** First commit date; repo fingerprints.
- **Label:** Phone/speed = CLAIM.
- **Paste IDs:** `PB-X-05`

#### C6 — Vision tease (gated)
- **Objective:** Signal roadmap without lying.
- **Rule:** First line must say *Building toward* / *Not shipped*.
- **Paste IDs:** `PB-X-06` (Human only by default)

#### C7 — Outreach
- **Objective:** 1:1 chamber intros.
- **Rule:** Personalize `{Name}`; never mass-blast invent metrics.
- **Paste IDs:** `PB-EM-01`, `PB-EM-02`, `PB-EM-03`, `PB-DM-01`

---

## 7. Channel playbooks

### X
- Cadence: 3 posts/week (1 single + 1 thread segment or ask + 1 reply day).
- Always EN. End product claims with “Not legal advice.” when stating what CiteBench does.
- Media: `public/og.jpg` only (no fake memo screenshots).
- Bot: may post rows with Bot mode = `Bot may post`, Claim = CONFIRMED, Approved + Preflight OK.

### WhatsApp status
- Cadence: on ship days + 1×/week reminder.
- Short beat preferred; longer optional.
- Bot: queue only; human posts status unless Voice API exists.

### Article
- Canonical: `/story`. Share; do not invent a second origin myth.
- Future articles: one job; claim level in standfirst if VISION.

### Replies
- Trigger bank in paste-bank (`PB-RPL-*`).
- Bot may draft replies; human approve unless Bot may post + CONFIRMED template match.

### Marketing blurbs
- Bios, LinkedIn, landing snippets — always include card-not-live if pricing mentioned.

### Personal messages / Outreach email
- Personalized; trust ask; sample chamber.
- Bot may draft; never send without Approved unless Bot may post explicitly set (default Human only).

---

## 8. Weekly operating rhythm

| Day | Human / bot action |
|---|---|
| Mon | Bot lists Ready queue; human sets Approved on CONFIRMED chamber/trust posts |
| Tue | Post 1 X (launch or trust); WhatsApp if shipping |
| Wed | Lawyer discovery ask OR reply day |
| Thu | Outreach batch (5–10 emails/DMs drafted; send only if Approved) |
| Fri | Build-in-public OR rename clarification; review inbound questions |
| Sat/Sun | Optional: queue refill from paste-bank; no VISION without label |

---

## 9. Offer & CTA ladder

1. **Read** `/story`
2. **Try** sample chamber (free, no trial)
3. **Reply** to trust ask
4. **Run** research on own matter (starts trial clock)
5. **Pay** ₹500/month — **blocked until card live** (do not CTA as live)

---

## 10. Competitive / confusion map

| Confusion | Correction (EN) |
|---|---|
| “Is this Nyaya Setu?” | GoI chatbot on doj.gov.in ≠ CiteBench chamber |
| “AI lawyer?” | Practice assistance; you confirm; not legal advice |
| “Does it file on eCourts?” | No |
| “Are cites court-verified?” | Verified = we retrieved an allowlisted URL |
| “Is billing live?” | Card not live yet |
| “Repo says nyayasetu” | Historical repo name; product is CiteBench |

---

## 11. Vision (later only)

From discovery plan — **VISION**, not live:
1. Order → action pipeline
2. Hearing brief as default
3. Morning command centre
4. Proceeding state machine
5. Unified lawyer inbox

Public rule: first sentence must mark *building toward* / *not shipped*.

---

## 12. Measurement (no invented numbers)

Track qualitatively until measured:
- Inbound replies to trust asks
- Confusion corrections needed (rename / AI lawyer)
- Sample chamber walkthroughs completed (personal observation)
- Calendar rows Posted with Posted URL filled

Leave all counts as `[need number]` until real.

---

## 13. Kill list (never publish)

- User/MAU/revenue/token invents
- “Under N hours” as measured fact without CLAIM label
- Play Store downloads (government app)
- Tele-Law as CiteBench support
- “We scrape Indian Kanoon” / “court-verified HTML”
- “Files on eCourts” / “payments are live”
- Calling the product NyayaSetu
- Hindi marketing copy (policy: English only)
- Vision features stated as shipped

---

## 14. Asset checklist

- [ ] Paste bank IDs mirrored to Calendar `Exact paste`
- [ ] Each Ready row has Channel, Claim level, Language=EN, Char count
- [ ] Approved + Preflight OK before Bot may post
- [ ] OG image only: `public/og.jpg`
- [ ] Repo mirror path filled for dual-home sync
