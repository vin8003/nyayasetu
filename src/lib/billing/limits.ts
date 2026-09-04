export const DEFAULT_TRIAL_DAYS = 30;
export const DEFAULT_TRIAL_CNR_FETCHES = 10;
/** @deprecated use DEFAULT_TRIAL_DAYS — kept so existing imports keep compiling. */
export const TRIAL_DAYS = DEFAULT_TRIAL_DAYS;

export const SETTINGS_KEY_TRIAL_DAYS = "trial_days";
export const SETTINGS_KEY_TRIAL_CNR = "trial_cnr_fetches";

export type TrialDefaults = {
  trialDays: number;
  trialCnrFetches: number;
};

export function parseTrialDays(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_TRIAL_DAYS;
  return Math.min(365, n);
}

export function parseTrialCnrFetches(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_TRIAL_CNR_FETCHES;
  return Math.min(1000, n);
}

export const DEFAULT_TRIAL: TrialDefaults = {
  trialDays: DEFAULT_TRIAL_DAYS,
  trialCnrFetches: DEFAULT_TRIAL_CNR_FETCHES,
};
