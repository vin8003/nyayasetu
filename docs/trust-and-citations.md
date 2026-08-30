# Trust and citations

CiteBench’s research value is **honest cites**, not a longer memo. A precedent is shown as verified only when the app can prove the URL was retrieved from an allowlisted host.

## Allowlist

`src/lib/research/legal-domains.ts`:

- `indiankanoon.org`
- `livelaw.in`
- `casemine.com`
- `judgments.ecourts.gov.in`
- `sci.gov.in`

Research `web_search` is filtered to these domains (`max_tool_calls: 3`). The app does **not** GET judgment HTML from Indian Kanoon (or anywhere else) to double-check a cite.

## Stamp after the model

`stampPrecedents` in `src/lib/research/verify.ts`:

1. Collect retrieved URLs from the xAI response (`citations`, message annotations) into `memo.citationUrls`.
2. Normalize (`http`/`https` only, strip `www`, trailing slash, hash).
3. Set `precedent.verified = true` **only if** the normalized URL is in that set **and** `hostAllowed`.
4. Overwrite the model’s boolean. A client-forged `verified: true` does not survive a re-stamp.
5. Reject empty URLs and non-http schemes (`javascript:`, etc.).

`httpHref` is the UI gate: only `http:` / `https:` strings become `href`. Letter views use it for ground URLs.

## What the memo may still contain

Unverified authorities stay on the memo under `unverified` and as `verified: false` rows so the advocate can see what the model wanted but could not retrieve. The UI must not treat those as citable.

## Court drafts reuse the same gate

`src/lib/research/letter-cites.ts`:

| Function | Rule |
|---|---|
| `citablePrecedentsFromMemo` | Re-stamp, then keep rows that are verified **and** have an allowlisted `httpHref` |
| `filterLetterGrounds` | Keep a ground with a cite only if it matches a citable URL (or the same reporter cite with the memo URL filled in). Invented URLs are dropped. Grounds with **no** cite are kept (legal propositions without a case). |
| `unverifiedCiteLabels` | Titles / cites / URLs that are not citable |
| `scrubUnverifiedText` | Those labels are deleted from heading, parties, facts, prayer, stand, verification, risks. Hanging prepositions after a deletion (`on`, `of`, `for`, …) are cleaned up. |

The letter **prompt** lists only citable authorities and forbids `web_search`. The letter **xAI body** has no `tools` key. Enforcement is still the stamp + filter: the model is not trusted.

## Practice-file trust (different problem)

Orders and tasks use **origin**, not URLs:

| Origin | Meaning |
|---|---|
| `court_direction` | Operative part of an order the lawyer confirmed |
| `ai_suggestion` / `ai_inference` | CiteBench to-do; not a court order |
| `statute` | Limitation / statutory diary item |
| `lawyer` | Typed by the advocate |
| `system` | Sample seed / housekeeping |

`TrustChip` renders court vs AI vs statute so the Today board cannot confuse a suggestion with a direction. Confirm-on-inbox is the write gate.

## Tests that lock this

- `src/lib/research/verify.test.ts` — stamp, host, `javascript:`, www/slash/hash
- `src/lib/research/letter-cites.test.ts` — filter, scrub, forged verified flag
- `src/lib/research/letter-prompt.test.ts` — no `tools` / `web_search` on the letter body
- `src/lib/practice/sample.test.ts` / `workflow.test.ts` — sample and stage helpers

If you add a new draft kind, keep `letterChrome` and `kindLine` as `Record<LetterKind, …>` and run grounds through `filterLetterGrounds` — do not add a second cite policy.
