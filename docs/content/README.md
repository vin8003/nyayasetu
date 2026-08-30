# CiteBench content system (repo mirror)

**English only** for all docs and posts.

Dual home with Notion. **Content Calendar** is the drafting/runtime queue. This tree is the committed mirror.

- Pack: https://app.notion.com/p/3ccf4949ea14818d9c1ce3892ee0580a  
- Calendar: https://app.notion.com/p/3ff4d2ce24974c32a8a528aefab436cd  
- Marketing plan (Notion): https://app.notion.com/p/3ccf4949ea14817b8492c5bbd9540d3b  
- Bot workflow (Notion): https://app.notion.com/p/3ccf4949ea1481daad34f14be601e81d  

Voice/bot does **not** publish without Approved + Preflight OK (see bot-workflow).

## Files

| File | Role |
|---|---|
| [marketing-plan.md](marketing-plan.md) | Full marketing plan (strategy, campaigns, cadence) |
| [bot-workflow.md](bot-workflow.md) | Autonomous queue state machine + SQL |
| [paste-bank.md](paste-bank.md) | Post-ready Exact paste bodies (PB-*) |
| [voice-and-claims.md](voice-and-claims.md) | Claim levels + kill list |
| [format-guides.md](format-guides.md) | Channel rules |
| [calendar.md](calendar.md) | DB schema + row index |
| [marketing-strategy.md](marketing-strategy.md) | Short pointer → marketing-plan |
| [../social-copy.md](../social-copy.md) | Pointer → paste-bank |

## How to post (human)

1. Open paste-bank → copy fenced Exact paste  
2. Or open Calendar row → copy **Exact paste**  
3. Publish on Channel  
4. Mark Pipeline=Posted, fill Posted URL, Approved remains yes  

## How a bot posts

See [bot-workflow.md](bot-workflow.md). Only `Bot may post` + CONFIRMED + Approved + Preflight OK + EN.

Last mirrored: **30 Aug 2026**.
