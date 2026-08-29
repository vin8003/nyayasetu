import type { HistoryItem, Intake, LegalMemo } from "./types";

const KEY = "nyayasetu.history.v1";
const LIMIT = 24;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readHistory(): HistoryItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHistory(items: HistoryItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, LIMIT)));
}

export function saveMemo(intake: Intake, memo: LegalMemo): HistoryItem {
  const item: HistoryItem = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    title: memo.title || memo.causeTitle || "Untitled memo",
    intake,
    memo,
  };
  writeHistory([item, ...readHistory().filter((h) => h.title !== item.title)]);
  return item;
}

export function removeMemo(id: string) {
  writeHistory(readHistory().filter((h) => h.id !== id));
}
