import type { StatuteRef } from "@/lib/research/types";

export type MemoWithStatutes = {
  id: string;
  title: string;
  memo: { statutes?: StatuteRef[] };
};

export function statuteKey(row: Pick<StatuteRef, "name" | "sections">): string {
  return `${row.name.trim()}|${row.sections.trim()}`.toLowerCase();
}

export function statutesFromMemos(memos: MemoWithStatutes[]): StatuteRef[] {
  const seen = new Set<string>();
  const out: StatuteRef[] = [];
  for (const item of memos) {
    for (const row of item.memo.statutes ?? []) {
      if (!row.name?.trim()) continue;
      const key = statuteKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        name: row.name.trim(),
        sections: row.sections?.trim() ?? "",
        why: row.why?.trim() ?? "",
        url: row.url?.trim() ?? "",
      });
    }
  }
  return out;
}
