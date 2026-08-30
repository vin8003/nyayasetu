export const INBOX_DRAFT_KEY = "citebench-inbox-draft";

export type InboxDraft = {
  matterId: string;
  body: string;
  title?: string;
};

export function writeInboxDraft(draft: InboxDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(INBOX_DRAFT_KEY, JSON.stringify(draft));
}

export function readInboxDraft(): InboxDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INBOX_DRAFT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INBOX_DRAFT_KEY);
    const parsed = JSON.parse(raw) as InboxDraft;
    if (!parsed?.matterId || typeof parsed.body !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
