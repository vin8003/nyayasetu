# Indian Kanoon adapter

Court-data provider behind Admin → Providers. Token auth.

## Secret

`IKANOON_API_TOKEN` — shared token from api.indiankanoon.org. Server only, never `VITE_`.

Header: `Authorization: Token <IKANOON_API_TOKEN>`

Optional later (does not fix Vercel connection reset):

- `IKANOON_CUSTOMER` — registered email for RSA headers
- `IKANOON_PRIVATE_KEY` — PEM; public key stays on Indian Kanoon’s site

## Live flow

Their `Allow` header is **POST, OPTIONS** (live curls 2026-09-04). Docs say GET; CiteBench **POSTs first**, GET only if POST is 405 or the socket dies.

```bash
curl -sS -X POST 'https://api.indiankanoon.org/search/' \
  -H "Authorization: Token $IKANOON_API_TOKEN" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'formInput=DLHC010223332023' \
  --data-urlencode 'pagenum=0'
```

Search `docs[].tid` is a number. Then GET `/doc/{tid}/` (POST if GET is 405). `doc` is HTML. CiteBench strips tags and lands **unconfirmed Inbox**. Confirm stays with the lawyer.
Live HTTP uses Node `https` over IPv4/HTTP/1.1 — Vercel `fetch` to Cloudflare often resets.
No eCourts.gov.in scrape.

## Connection test (Admin → Court data)

**Test Indian Kanoon connection** runs from the deployed server and reports:

| Step | What it shows |
|---|---|
| runtime | Region env (`VERCEL_REGION` / `AWS_REGION`) and which hosting env var *names* exist |
| egress | The server's outbound IP and country (ipinfo.io) — Indian Kanoon / Cloudflare may reset non-Indian datacenter IPs |
| dns | A records for `api.indiankanoon.org` |
| reach | Unauthenticated POST `/search/` — a 401 means TCP + TLS + HTTP all work. Free. |
| search | One authenticated search for the CNR and at most one document. **Billed** by Indian Kanoon. |

Each network step lists every transport attempt (`via#round=code-or-status/ms`). The same line is logged as `[ik] all attempts failed …` whenever a live fetch fails, so hosting logs show the reason too.

The `bom1` region pin in `vite.config.ts` only applies to real Vercel deploys. On other hosting (e.g. Grok hosting), check the egress country here.

Network errors name the step (`during search` / `during document`). If every document call fails on the network, the fetch reports a network error instead of "returned hits but no order text".
