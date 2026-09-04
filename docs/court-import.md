# Auto case import

Lawyers can reconstruct an existing file from a court and case number. The official source is the authority; CiteBench does not bypass CAPTCHA or scrape around it.

## What is reused

- Matters, papers (`matter_documents`), orders, timeline, tasks, deadlines, hearings
- Origin chips (`court_direction` vs `ai_inference`) and editable sheets
- PDF / image reading (`extractUploads`) for orders the lawyer uploads after CAPTCHA
- xAI only as an optional chronology enricher (skipped on demo records)

## What is new

- `CourtAdapter` registry (`src/lib/court-import/`) — district eCourts and Delhi High Court first
- Import job + records (`migrations/0007_case_import.sql`)
- Deterministic chronology / deadline extractors
- Human-assisted CAPTCHA continuation (open official site → paste status / upload)

## First courts

| Adapter | Official source | Lookup |
|---|---|---|
| District courts (eCourts) | [eCourts case status](https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index) | CNR, or type + number + year |
| Delhi High Court | [DHC case status](https://delhihighcourt.nic.in/app/case-status) | Type + number + year |

Live lookups stop at CAPTCHA. Two published demo identifiers run the full reconstruction without a live fetch:

- CNR `DLND010012342025` / `CS 184/2025` (Tis Hazari)
- `W.P.(C) 3312/2025` (Delhi High Court)

## Dedup / sync

Records are keyed by court `external_id`, SHA-256 of the original body, and date+title. Fetch / Sync is idempotent.

## Traceability

Every imported paper keeps `source_url` and the original text. Timeline events point at that paper (`ref_id`) and carry a verification state: court imported, AI inferred, or lawyer verified.
