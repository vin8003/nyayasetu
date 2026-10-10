/**
 * Grok model IDs per action. Same xAI endpoints and auth everywhere; only the model varies.
 * Override per deploy with XAI_MODEL_RESEARCH / XAI_MODEL_FAST.
 */
export const DEFAULT_FAST_MODEL = "grok-4.20-0309-non-reasoning";
export const DEFAULT_RESEARCH_MODEL = "grok-4.20-0309-reasoning";

type Env = NodeJS.Dict<string | undefined>;

function pick(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

/** Research memo and follow-up: web search plus reasoning. */
export function researchModel(env: Env = process.env): string {
  return pick(env.XAI_MODEL_RESEARCH, DEFAULT_RESEARCH_MODEL);
}

/** Letters, extraction, briefs, drafts, chronology, OCR. */
export function fastModel(env: Env = process.env): string {
  return pick(env.XAI_MODEL_FAST, DEFAULT_FAST_MODEL);
}

export function isReasoningModel(model: string): boolean {
  return /reasoning/i.test(model) && !/non-reasoning/i.test(model);
}
