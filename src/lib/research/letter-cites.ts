import type { LegalMemo, LetterGround, Precedent } from "./types.ts";
import { hostAllowed, httpHref, normalizeCitationUrl, stampPrecedents } from "./verify.ts";

export function citablePrecedentsFromMemo(memo: LegalMemo): Precedent[] {
  const { precedents } = stampPrecedents(memo.precedents ?? [], memo.citationUrls ?? [], memo.unverified ?? []);
  return precedents.filter((precedent) => precedent.verified && httpHref(precedent.url) && hostAllowed(precedent.url));
}

function citationKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function filterLetterGrounds(grounds: LetterGround[], citable: Precedent[]): LetterGround[] {
  const byUrl = new Map<string, Precedent>();
  const byCite = new Map<string, Precedent>();
  for (const precedent of citable) {
    const normalized = normalizeCitationUrl(precedent.url);
    if (normalized) byUrl.set(normalized, precedent);
    const key = citationKey(precedent.citation);
    if (key && !byCite.has(key)) byCite.set(key, precedent);
  }

  const kept: LetterGround[] = [];
  for (const ground of grounds) {
    const urlTrim = ground.url.trim();
    let match: Precedent | undefined;
    if (urlTrim) {
      const href = httpHref(urlTrim);
      if (!href) continue;
      const normalized = normalizeCitationUrl(href);
      if (!normalized) continue;
      match = byUrl.get(normalized);
    } else {
      match = byCite.get(citationKey(ground.citation));
    }
    if (!match) continue;
    const safe = httpHref(match.url);
    if (!safe) continue;
    kept.push({
      heading: ground.heading.trim(),
      text: ground.text.trim(),
      citation: match.citation,
      url: safe,
    });
  }
  return kept;
}
