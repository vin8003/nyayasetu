# Indian Kanoon adapter

Court-data provider behind Admin → Providers. Token auth. **POST only** (`allow: POST, OPTIONS`).

## Secret

`IKANOON_API_TOKEN` — shared token from api.indiankanoon.org. Server only, never `VITE_`.

Header: `Authorization: Token <IKANOON_API_TOKEN>`

## Live flow (verified 2026-09-04)

```bash
curl -sS -X POST 'https://api.indiankanoon.org/search/' \
  -H "Authorization: Token $IKANOON_API_TOKEN" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'formInput=DLHC010097752026' \
  --data-urlencode 'pagenum=0'
```

Search `docs[].tid` is a number. Then:

```bash
curl -sS -X POST "https://api.indiankanoon.org/doc/99098448/" \
  -H "Authorization: Token $IKANOON_API_TOKEN" \
  -H 'Accept: application/json'
```

Document `doc` is HTML. CiteBench strips tags and lands **unconfirmed Inbox**. Confirm stays with the lawyer.
GET is rejected (405). No eCourts.gov.in scrape.
