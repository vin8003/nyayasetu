/**
 * Server-only. Never import from a client component.
 * Fail closed: empty or non-live prefix is treated as missing.
 */
export function resolveEciApiKey(env: NodeJS.Dict<string | undefined> = process.env): string | null {
  const key = (env.ECI_API_KEY ?? "").trim();
  if (!key) return null;
  if (!key.startsWith("eci_live_")) return null;
  return key;
}

export function isEciConfigured(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  return Boolean(resolveEciApiKey(env));
}
