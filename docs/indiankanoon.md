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
