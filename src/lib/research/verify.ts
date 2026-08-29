import type { Precedent } from "./types.ts";
import { LEGAL_DOMAINS } from "./legal-domains.ts";

function withScheme(url: string): string {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

export function normalizeCitationUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(withScheme(trimmed));
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    parsed.hash = "";
    parsed.hostname = host;
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function hostAllowed(url: string, domains: readonly string[] = LEGAL_DOMAINS): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    let host = new URL(withScheme(trimmed)).hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function stampPrecedents(
  precedents: Precedent[],
  citationUrls: string[],
  existingUnverified: string[] = [],
): { precedents: Precedent[]; unverified: string[] } {
  const retrieved = new Set(
    citationUrls.map(normalizeCitationUrl).filter((item): item is string => item !== null),
  );
  const unverified: string[] = [];
  const seen = new Set<string>();
  const note = (label: string) => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    unverified.push(label);
  };
  for (const item of existingUnverified) note(item);

  const stamped = precedents.map((precedent) => {
    const normalized = normalizeCitationUrl(precedent.url);
    const verified = Boolean(normalized && retrieved.has(normalized) && hostAllowed(precedent.url));
    if (!verified) note(precedent.title || precedent.citation || precedent.url || "unverified authority");
    return { ...precedent, verified };
  });

  return { precedents: stamped, unverified };
}
