/** Deterministic content id — isomorphic (no node:crypto) so the client bundle stays clean. */
export function contentHash(...parts: Array<string | null | undefined>): string {
  const raw = parts
    .map((p) => (p ?? "").trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  let h1 = 2166136261;
  let h2 = 5381;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = (h2 * 33) ^ c;
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  const n = raw.length.toString(16).padStart(8, "0");
  return (a + b + n + a).slice(0, 32);
}

export function normalizeCnr(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizeCaseNumber(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}
