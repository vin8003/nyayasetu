import type { LegalMemo, LetterGround, Precedent } from "./types.ts";
import { hostAllowed, httpHref, normalizeCitationUrl, stampPrecedents } from "./verify.ts";

export function citablePrecedentsFromMemo(memo: LegalMemo): Precedent[] {
  const { precedents } = stampPrecedents(memo.precedents ?? [], memo.citationUrls ?? [], memo.unverified ?? []);
  return precedents.filter((precedent) => precedent.verified && httpHref(precedent.url) && hostAllowed(precedent.url));
}

function citationKey(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function unverifiedCiteLabels(memo: LegalMemo): string[] {
  const citable = citablePrecedentsFromMemo(memo);
  const allowed = new Set<string>();
  for (const precedent of citable) {
    for (const value of [precedent.title, precedent.citation, precedent.url]) {
      const trimmed = value.trim();
      if (trimmed.length >= 8) allowed.add(trimmed);
    }
  }
  const labels: string[] = [];
  const add = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 8 || allowed.has(trimmed) || labels.includes(trimmed)) return;
    labels.push(trimmed);
  };
  for (const note of memo.unverified ?? []) add(note);
  for (const precedent of memo.precedents ?? []) {
    const normalized = normalizeCitationUrl(precedent.url);
    if (normalized && citable.some((row) => normalizeCitationUrl(row.url) === normalized)) continue;
    add(precedent.title);
    add(precedent.citation);
    add(precedent.url);
  }
  return labels.sort((a, b) => b.length - a.length);
}

export function scrubUnverifiedText(text: string, banned: string[]): string {
  let out = text;
  for (const label of banned) {
    if (!label) continue;
    out = out.split(label).join("");
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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
    const citeTrim = ground.citation.trim();
    if (!urlTrim && !citeTrim) {
      if (!ground.heading.trim() && !ground.text.trim()) continue;
      kept.push({ heading: ground.heading.trim(), text: ground.text.trim(), citation: "", url: "" });
      continue;
    }
    let match: Precedent | undefined;
    if (urlTrim) {
      const href = httpHref(urlTrim);
      if (!href) continue;
      const normalized = normalizeCitationUrl(href);
      if (!normalized) continue;
      match = byUrl.get(normalized);
    } else {
      match = byCite.get(citationKey(citeTrim));
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
