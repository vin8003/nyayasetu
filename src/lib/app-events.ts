/**
 * Window events that let any screen open the shell's global surfaces (the
 * command palette, the new-matter panel) and nudge shared counts to refresh.
 */

export type NewMatterPrefill = {
  title?: string;
  courtName?: string;
  caseNumber?: string;
  cnr?: string;
  proceeding?: string;
  ourSide?: string;
  notes?: string;
};

export type NewMatterRequest = {
  mode?: "cnr" | "manual";
  prefill?: NewMatterPrefill;
  /** Research memo to file on the new matter once it exists. */
  memoId?: string;
  /** A paper to save on the new matter once it exists. */
  paper?: { title: string; body: string; kind: string; aiDraft: boolean };
  /** Stay on the current page instead of opening the new file. */
  stay?: boolean;
  onCreated?: (matter: { id: string; title: string }) => void;
};

const NEW_MATTER = "cb:new-matter";
const PALETTE = "cb:palette";
const COUNTS = "cb:counts";

export function openNewMatter(request: NewMatterRequest = {}) {
  window.dispatchEvent(new CustomEvent<NewMatterRequest>(NEW_MATTER, { detail: request }));
}

export function onNewMatter(handler: (request: NewMatterRequest) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<NewMatterRequest>).detail ?? {});
  window.addEventListener(NEW_MATTER, listener);
  return () => window.removeEventListener(NEW_MATTER, listener);
}

export function openPalette() {
  window.dispatchEvent(new Event(PALETTE));
}

export function onPalette(handler: () => void) {
  window.addEventListener(PALETTE, handler);
  return () => window.removeEventListener(PALETTE, handler);
}

export function refreshCounts() {
  window.dispatchEvent(new Event(COUNTS));
}

export function onCountsChanged(handler: () => void) {
  window.addEventListener(COUNTS, handler);
  return () => window.removeEventListener(COUNTS, handler);
}
