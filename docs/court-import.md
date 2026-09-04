# Auto case import

Live **CNR fetch** uses the [eCourtsIndia Partner API](eci-partner.md). CiteBench does not open the official eCourts CAPTCHA page or continue from a pasted court-status handoff.

Published demo identifiers still reconstruct a file locally (no live scrape):

- CNR `DLND010012342025` / `CS 184/2025` (Tis Hazari)
- `W.P.(C) 3312/2025` (Delhi High Court)

Partner-fetched orders land in **Inbox unconfirmed**. Demo reconstruction still writes the chronology onto the file.

## Dedup / sync

Records are keyed by court `external_id`, content hash of the original body, and date+title. Fetch is idempotent.
