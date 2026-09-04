import type { BillingSnapshot } from "./plan";

const KEY = "citebench-entitlement-v2";
const TTL_MS = 90_000;

type Cached = { at: number; snap: BillingSnapshot };

export function readEntitlementCache(): BillingSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.snap || typeof parsed.at !== "number") return null;
    if (typeof parsed.snap.canFetchCnr !== "boolean") {
      sessionStorage.removeItem(KEY);
      return null;
    }
    if (Date.now() - parsed.at > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed.snap;
  } catch {
    return null;
  }
}

export function writeEntitlementCache(snap: BillingSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), snap }));
  } catch {
    /* quota */
  }
}

export function clearEntitlementCache(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
