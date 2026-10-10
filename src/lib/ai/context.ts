/** Prompt fragments shared by every Grok call so each action gets the same legal context. */

/** Today's date in India (YYYY-MM-DD), for deadlines and "within N weeks" arithmetic. */
export function todayIst(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function todayLine(now: Date = new Date()): string {
  return `Today's date (India): ${todayIst(now)}.`;
}

export const INDIAN_LAW_CONTEXT = `Indian law context:
- From 1 July 2024 the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS) and Bharatiya Sakshya Adhiniyam (BSA) replaced the IPC, CrPC and Indian Evidence Act. Apply the law in force on the date of the offence or proceeding. Where the facts straddle that date, or the old provision is better known, give both (e.g. "s.482 BNSS (old s.438 CrPC)").
- Check limitation (Limitation Act, 1963, and any special statute) and jurisdiction before merits.
- Precedent: Supreme Court decisions bind every court (Art. 141). A High Court binds courts subordinate to it; other High Courts are persuasive. A larger bench binds a smaller one.`;

export const HINDI_RULE =
  "Output language: Hindi. Write formal legal Hindi in Devanagari script, as used in Indian court pleadings. Keep case names, citations, statute names, section numbers and URLs in English.";

export const ENGLISH_RULE = "Output language: English (Indian legal usage).";

export function langRule(lang: string): string {
  return lang === "hi" ? HINDI_RULE : ENGLISH_RULE;
}
