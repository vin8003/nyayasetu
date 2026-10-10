/**
 * Server-only Indian Kanoon token. Never import from a client component.
 * Header: Authorization: Token <IKANOON_API_TOKEN>
 * Fail closed when unset or unusable.
 */
type Env = NodeJS.Dict<string | undefined>;

// Whitespace anywhere (incl. NBSP and line breaks from a pasted value) and zero-width marks.
const INVISIBLE = /[\s\u00A0\u200B-\u200D\u2060\uFEFF]/g;
const QUOTES = /^["'`\u2018\u2019\u201C\u201D]+|["'`\u2018\u2019\u201C\u201D]+$/g;
// What an HTTP header value can carry safely; Indian Kanoon tokens are hex.
const HEADER_SAFE = /^[\x21-\x7E]+$/;

export type IkTokenStatus =
  | { token: string; problem: null }
  | { token: null; problem: "missing" | "pem" | "too_short" | "invalid_chars"; detail: string };

function rawToken(env: Env): string {
  return env.IKANOON_API_TOKEN ?? env.IKANOON_TOKEN ?? env.INDIANKANOON_API_TOKEN ?? "";
}

function codePoint(ch: string): string {
  return `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Cleans a pasted token and says why it is unusable — never echoing token characters. */
export function resolveIkTokenStatus(env: Env = process.env): IkTokenStatus {
  const raw = rawToken(env);
  if (!raw.trim()) return { token: null, problem: "missing", detail: "IKANOON_API_TOKEN is not set" };
  if (raw.includes("BEGIN") || raw.includes("PRIVATE KEY")) {
    return { token: null, problem: "pem", detail: "IKANOON_API_TOKEN holds a PEM key, not the API token" };
  }
  const token = raw
    .trim()
    .replace(QUOTES, "")
    .replace(/^(Token|Bearer)[\s\u00A0]+/i, "")
    .replace(INVISIBLE, "")
    .replace(QUOTES, "");
  if (!HEADER_SAFE.test(token)) {
    const bad = [...new Set([...token].filter((ch) => !HEADER_SAFE.test(ch)).map(codePoint))];
    return {
      token: null,
      problem: "invalid_chars",
      detail: `IKANOON_API_TOKEN contains characters that cannot be sent in a header (${bad.join(", ")}). Re-paste the token as plain text.`,
    };
  }
  if (token.length < 12) {
    return { token: null, problem: "too_short", detail: "IKANOON_API_TOKEN is too short to be an API token" };
  }
  return { token, problem: null };
}

export function resolveIkApiToken(env: Env = process.env): string | null {
  return resolveIkTokenStatus(env).token;
}

export function isIkConfigured(env: Env = process.env): boolean {
  return Boolean(resolveIkApiToken(env));
}

export function ikAuthHeaders(token: string): {
  Authorization: string;
  Accept: string;
} {
  return {
    Authorization: `Token ${token}`,
    Accept: "application/json",
  };
}
