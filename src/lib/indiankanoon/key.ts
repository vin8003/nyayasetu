/**
 * Server-only Indian Kanoon token. Never import from a client component.
 * Header: Authorization: Token <IKANOON_API_TOKEN>
 * Fail closed when unset.
 */
export function resolveIkApiToken(env: NodeJS.Dict<string | undefined> = process.env): string | null {
  const raw = (env.IKANOON_API_TOKEN ?? env.IKANOON_TOKEN ?? env.INDIANKANOON_API_TOKEN ?? "").trim();
  if (!raw) return null;
  if (raw.includes("BEGIN") || raw.includes("PRIVATE KEY")) return null;
  const token = raw.replace(/^(Token|Bearer)\s+/i, "").trim().replace(/^["']|["']$/g, "");
  if (token.length < 12) return null;
  return token;
}

export function isIkConfigured(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  return Boolean(resolveIkApiToken(env));
}

export function ikAuthHeaders(token: string): {
  Authorization: string;
  Accept: string;
  "User-Agent": string;
} {
  return {
    Authorization: `Token ${token}`,
    Accept: "application/json",
    "User-Agent": "CiteBench/1.0 (court-data adapter)",
  };
}
