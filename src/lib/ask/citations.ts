import { hostAllowed, normalizeCitationUrl } from "../research/verify.ts";

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)]+/g;
const CASE_NAME = String.raw`[A-Z][\w.'’]+(?:\s+[A-Z][\w.'’]+){0,6}\s+v\.?\s+[A-Z][\w.'’]+(?:\s+[A-Z][\w.'’]+){0,6}`;
const REPORTER = new RegExp(
  `(?:${CASE_NAME}\\s+)?(?:\\bAIR\\s+\\d{4}\\s+[A-Za-z.]+\\s+\\d+|\\(\\d{4}\\)\\s+\\d+\\s+SCC(?:\\s+OnLine)?\\s+\\d+|\\b\\d{4}\\s+SCC(?:\\s+OnLine)?(?:\\s+[A-Za-z]+)?\\s+\\d+)`,
  "g",
);

export function verifiedSourceUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!hostAllowed(url)) continue;
    const normalized = normalizeCitationUrl(url);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

/**
 * Keep only authorities this search actually retrieved on the research domains.
 * Reporter cites with no retrieved link are removed. Statute talk that is not a
 * reporter cite is left for the Indian-law rules in the prompt.
 */
export function groundAskReply(text: string, retrieved: string[]): { text: string; sources: string[] } {
  const sources = verifiedSourceUrls(retrieved);
  const allowed = new Set(sources);
  let dropped = false;
  let next = text.replace(MD_LINK, (full, label: string, url: string) => {
    const normalized = normalizeCitationUrl(url);
    if (normalized && allowed.has(normalized)) return `[${label}](${normalized})`;
    dropped = true;
    return "";
  });
  next = next.replace(BARE_URL, (url) => {
    const normalized = normalizeCitationUrl(url);
    if (normalized && allowed.has(normalized)) return normalized;
    dropped = true;
    return "";
  });
  const held: string[] = [];
  next = next.replace(MD_LINK, (full) => {
    held.push(full);
    return `\u0000${held.length - 1}\u0000`;
  });
  if (REPORTER.test(next)) dropped = true;
  REPORTER.lastIndex = 0;
  next = next.replace(REPORTER, "");
  next = next.replace(/\u0000(\d+)\u0000/g, (_, index: string) => held[Number(index)] ?? "");
  next = tidy(next);
  if (dropped) {
    next = `${next}\n\nA name or cite was left out because this search did not retrieve it.`.trim();
  }
  if (sources.length) {
    next = `${next}\n\n**Sources**\n${sources.map((url) => `- ${url}`).join("\n")}`.trim();
  }
  return { text: next, sources };
}
