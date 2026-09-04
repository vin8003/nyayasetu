# eCourtsIndia Partner API (CNR fetch)

Live CNR fetch uses the **active court-data adapter** (Admin → Providers). The default adapter is the **eCourtsIndia Partner API only**. CiteBench does not open eCourts.gov.in, does not complete CAPTCHA, and does not accept a paste-status handoff as a substitute for this fetch.

Register a new adapter in `src/lib/court-providers/adapters/` and append it to `COURT_ADAPTERS`. The admin desk switches the global provider for every chamber. Indian Kanoon is registered as `indiankanoon` (token auth: `IKANOON_API_TOKEN`).

## Contract

- Base: `https://webapi.ecourtsindia.com`
- Auth: `Authorization: Bearer <ECI_API_KEY>` (token prefix `eci_live_`). Server-only. Never `VITE_`.
- GET `/api/partner/case/{cnr}`
- POST `/api/partner/case/{cnr}/refresh` when the matter already has Partner papers
- Orders land as **unconfirmed Inbox** via `insertPastedDocument` / `insertUnconfirmedOrder` / `runExtractOrder`. Confirm is a human step.
- Sample chamber, published demo CNR (`DLND010012342025`), and blank CNR are skipped. Missing key, HTTP errors, or empty parse fail closed — no invented body.
- First courts in copy: Rajasthan, Uttar Pradesh, Madhya Pradesh, Delhi (not a hard reject).
- Re-fetch dedupes by content hash, `external_id`, and date+title.

## Terms

CiteBench uses the Partner API to assist a lawyer with their own matters. Do not use this path for stand-alone competing court-data resale without a written MSA / consent from eCourtsIndia.
