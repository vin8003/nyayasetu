/** Official eCourts sites CiteBench must not scrape, CAPTCHA, or paste-handoff. */
export const FORBIDDEN_COURT_HOSTS = ["services.ecourts.gov.in", "hcservices.ecourts.gov.in"] as const;

export function isForbiddenCourtUrl(url: string): boolean {
  const raw = (url || "").trim();
  if (!raw) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return FORBIDDEN_COURT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return /(?:^|[/.])(?:hc)?services\.ecourts\.gov\.in/i.test(raw);
  }
}

export function safeCourtUrl(url: string): string {
  return isForbiddenCourtUrl(url) ? "" : url;
}
