import { getSql } from "@/lib/db";
import {
  DEFAULT_TRIAL,
  SETTINGS_KEY_TRIAL_CNR,
  SETTINGS_KEY_TRIAL_DAYS,
  parseTrialCnrFetches,
  parseTrialDays,
  type TrialDefaults,
} from "./limits";
import { PLAN_ID, addDays, computeSnapshot, mapEntitlementRow } from "./plan";

export async function readTrialDefaults(): Promise<TrialDefaults> {
  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      select key, value from app_settings
      where key in (${SETTINGS_KEY_TRIAL_DAYS}, ${SETTINGS_KEY_TRIAL_CNR})
    `;
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      trialDays: parseTrialDays(map[SETTINGS_KEY_TRIAL_DAYS]),
      trialCnrFetches: parseTrialCnrFetches(map[SETTINGS_KEY_TRIAL_CNR]),
    };
  } catch {
    return { ...DEFAULT_TRIAL };
  }
}

export async function writeTrialDefaults(
  next: { trialDays: number; trialCnrFetches: number },
  adminId: string,
): Promise<TrialDefaults> {
  const trialDays = parseTrialDays(String(next.trialDays));
  const trialCnrFetches = parseTrialCnrFetches(String(next.trialCnrFetches));
  const sql = await getSql();
  await sql`
    insert into app_settings (key, value, updated_at, updated_by)
    values (${SETTINGS_KEY_TRIAL_DAYS}, ${String(trialDays)}, now(), ${adminId})
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now(),
      updated_by = excluded.updated_by
  `;
  await sql`
    insert into app_settings (key, value, updated_at, updated_by)
    values (${SETTINGS_KEY_TRIAL_CNR}, ${String(trialCnrFetches)}, now(), ${adminId})
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now(),
      updated_by = excluded.updated_by
  `;
  return { trialDays, trialCnrFetches };
}

const TRIAL_CNR_LIMIT_MESSAGE =
  "Trial live CNR fetches are used up. Subscribe to keep fetching from the court-data API.";

export async function gateLiveCnrFetch(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: "TRIAL_LIMIT"; message: string }> {
  const sql = await getSql();
  const defaults = await readTrialDefaults();
  const rows = await sql`select * from entitlements where user_id = ${userId} limit 1`;
  if (!rows[0]) {
    if (defaults.trialCnrFetches <= 0) {
      return { ok: false, error: "TRIAL_LIMIT", message: TRIAL_CNR_LIMIT_MESSAGE };
    }
    return { ok: true };
  }
  const snap = computeSnapshot(mapEntitlementRow(rows[0] as Record<string, unknown>), new Date(), defaults);
  if (snap.canFetchCnr) return { ok: true };
  return { ok: false, error: "TRIAL_LIMIT", message: TRIAL_CNR_LIMIT_MESSAGE };
}

export async function recordLiveCnrFetch(userId: string): Promise<void> {
  const sql = await getSql();
  const defaults = await readTrialDefaults();
  const ends = addDays(new Date(), defaults.trialDays).toISOString();
  await sql`
    insert into entitlements (user_id, status, plan, trial_started_at, trial_ends_at, cnr_fetches_used)
    values (${userId}, 'trial', ${PLAN_ID}, now(), ${ends}, 0)
    on conflict (user_id) do nothing
  `;
  await sql`
    update entitlements
    set cnr_fetches_used = coalesce(cnr_fetches_used, 0) + 1,
        updated_at = now()
    where user_id = ${userId}
  `;
}
