import { courtById } from "./courts.ts";
import type { HistoryItem } from "./types.ts";

export type HistoryThread = {
  root: HistoryItem;
  children: HistoryItem[];
  latestAt: string;
};

export function normalizeMemoQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

export function memoSearchText(item: HistoryItem): string {
  const court = courtById(item.intake.courtId);
  const issues = (item.memo.issues ?? []).map((row) => row.issue).join(" ");
  return [
    item.title,
    item.memo.causeTitle,
    item.memo.factsSummary,
    item.intake.facts,
    item.intake.query,
    court.name,
    court.nameHi,
    issues,
    item.memo.fullMemo.slice(0, 2000),
  ]
    .join("\n")
    .toLowerCase();
}

export function memoMatchesQuery(item: HistoryItem, q: string): boolean {
  const needle = normalizeMemoQuery(q);
  if (needle.length < 2) return true;
  return memoSearchText(item).includes(needle);
}

function rootOf(item: HistoryItem, byId: Map<string, HistoryItem>): HistoryItem {
  let cur = item;
  const seen = new Set<string>();
  while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = byId.get(cur.parentId)!;
  }
  return cur;
}

/** Group follow-ups under the original memo. Newest thread first. */
export function groupMemoHistory(items: HistoryItem[]): HistoryThread[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const buckets = new Map<string, HistoryThread>();
  for (const item of items) {
    const root = rootOf(item, byId);
    let thread = buckets.get(root.id);
    if (!thread) {
      thread = { root, children: [], latestAt: root.createdAt };
      buckets.set(root.id, thread);
    }
    if (item.id !== root.id) thread.children.push(item);
    if (item.createdAt > thread.latestAt) thread.latestAt = item.createdAt;
  }
  for (const thread of buckets.values()) {
    thread.children.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return [...buckets.values()].sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

/** Keep a matching follow-up in its parent thread instead of showing it alone. */
export function threadsMatchingQuery(items: HistoryItem[], q: string): HistoryThread[] {
  const grouped = groupMemoHistory(items);
  const needle = normalizeMemoQuery(q);
  if (needle.length < 2) return grouped;
  return grouped.filter(
    (thread) =>
      memoMatchesQuery(thread.root, q) || thread.children.some((child) => memoMatchesQuery(child, q)),
  );
}
