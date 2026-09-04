# Indian Kanoon adapter

Court-data provider behind Admin → Providers. Token auth.

## Secret

`IKANOON_API_TOKEN` — shared token from api.indiankanoon.org. Server only, never `VITE_`.

Header: `Authorization: Token <IKANOON_API_TOKEN>`

## Live flow

Official docs are **GET**. Their `Allow` header also lists POST. CiteBench tries GET first, then POST if GET is 405 or the socket dies.

```bash
curl -sS 'https://api.indiankanoon.org/search/?formInput=DLHC010223332023&pagenum=0' \
  -H "Authorization: Token $IKANOON_API_TOKEN" \
  -H 'Accept: application/json'
```

Search `docs[].tid` is a number. Then:

```bash
curl -sS "https://api.indiankanoon.org/doc/128126463/" \
  -H "Authorization: Token $IKANOON_API_TOKEN" \
  -H 'Accept: application/json'
```

Document `doc` is HTML. CiteBench strips tags and lands **unconfirmed Inbox**. Confirm stays with the lawyer.
No eCourts.gov.in scrape.
