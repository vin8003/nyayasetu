# Content Calendar (Notion mirror)

**Database:** [Citebench — Content Calendar](https://app.notion.com/p/3ff4d2ce24974c32a8a528aefab436cd)  
**Data source:** `collection://8487b4bc-cbe1-4d7c-8727-7b5cff55d505`

## Schema (required fields for the goal)

| Property | Type | Notes |
|---|---|---|
| **Name** | Title | Post working title |
| **Status** | Status | Not started / In progress / Done |
| **Channel** | Select | X, Article, Reply, Marketing, WhatsApp status, Personal message, Outreach email, Other |
| **Claim level** | Select | CONFIRMED, CLAIM, VISION, SAMPLE ONLY, `[need number]` |
| Pipeline | Select | Idea → Draft → Ready → Needs approval → Posted / Killed |
| Language | Select | EN, HI, EN+HI |
| Campaign | Select | Rename, Trust rules, Chamber launch, Lawyer discovery, Build in public, Vision tease, Outreach |
| Audience | Multi-select | Advocates, Juniors, Seniors, Builders, Press, Clients of lawyers |
| Scheduled | Date | Calendar view |
| Angle / Body / Notes | Text | Draft fields |
| CTA / link, Posted URL | URL | |
| Approved | Checkbox | Vineet yes |
| Repo mirror | Text | Path into `docs/content/` |
| Post ID | Auto ID | `CB` prefix |

## Views

- By status (board)
- By channel (board)
- By claim level (board)
- By pipeline (board)
- Calendar (by Scheduled)
- Upcoming (linked table on content system hub)

## Seeded rows (30 Aug 2026)

| Name | Channel | Claim level | Pipeline |
|---|---|---|---|
| X — desk to chamber (EN single) | X | CONFIRMED | Ready |
| X — desk to chamber (HI single) | X | CONFIRMED | Ready |
| X — trust thread (EN 1–5) | X | CONFIRMED | Ready |
| X — trust thread (HI 1–5) | X | CONFIRMED | Ready |
| X — rename hygiene (SAMPLE ONLY) | X | SAMPLE ONLY | Draft |
| X — lawyer feedback ask | X | CONFIRMED | Ready |
| X — VISION tease (personal assistant) | X | VISION | Idea |
| X — build in public (CLAIM) | X | CLAIM | Draft |
| Article — /story share line | Article | CONFIRMED | Ready |
| Marketing — chamber pitch blurb | Marketing | CONFIRMED | Ready |
| WhatsApp status — EN short + long | WhatsApp status | CONFIRMED | Ready |
| WhatsApp status — HI | WhatsApp status | CONFIRMED | Ready |
| Reply bank — common confusions | Reply | CONFIRMED | Ready |
| Personal DM — advocate feedback | Personal message | CONFIRMED | Ready |
| Outreach email — advocate intro | Outreach email | CONFIRMED | Ready |
| Outreach email — senior chamber | Outreach email | CONFIRMED | Draft |
| Outreach email — rename clarification | Outreach email | CONFIRMED | Ready |
| VISION — roadmap narrative beats | Other | VISION | Idea |

Authoritative bodies live on the Notion rows and in [paste-bank.md](paste-bank.md).
