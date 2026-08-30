export const SAMPLE_TITLES = [
  "Sharma v Apex Traders Pvt Ltd",
  "State v Rakesh Kumar",
  "Mehta v State of Rajasthan",
] as const;

export const SAMPLE_CASE_NUMBERS = [
  "CS (COMM) 412/2026",
  "Bail 88/2026",
  "CWP 2104/2026",
] as const;

export function isSampleTitle(title: string) {
  return (SAMPLE_TITLES as readonly string[]).includes(title);
}

export function isSampleMatter(input: { title?: string | null; caseNumber?: string | null } = {}) {
  const title = (input.title ?? "").trim();
  const caseNumber = (input.caseNumber ?? "").trim();
  if (title && isSampleTitle(title)) return true;
  if (caseNumber && (SAMPLE_CASE_NUMBERS as readonly string[]).includes(caseNumber)) return true;
  return false;
}

/** Sample chamber work is free — it must not start or consume the 30-day trial. */
export function looksLikeSample(input: { title?: string | null; facts?: string | null } = {}) {
  const title = (input.title ?? "").trim();
  if (title && isSampleTitle(title)) return true;
  const facts = input.facts ?? "";
  if (!facts) return false;
  return SAMPLE_TITLES.some((t) => facts.includes(`Matter: ${t}`));
}
