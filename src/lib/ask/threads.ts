export type AskChatRow = {
  id: string;
  matterId: string | null;
  matterTitle: string;
  title: string;
  updatedAt: string;
};

export type AskGroup = {
  key: string;
  matterId: string | null;
  label: string;
  chats: AskChatRow[];
};

export function chatTitle(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return "Ask";
  return line.length <= 72 ? line : `${line.slice(0, 71)}…`;
}

/** Newest chat first. One group per case; general questions share one group. */
export function groupAskChats(rows: AskChatRow[], generalLabel: string): AskGroup[] {
  const order: string[] = [];
  const map = new Map<string, AskGroup>();
  for (const row of rows) {
    const key = row.matterId ? `m:${row.matterId}` : row.matterTitle ? `t:${row.matterTitle}` : "general";
    const label = row.matterId || row.matterTitle ? row.matterTitle || generalLabel : generalLabel;
    let group = map.get(key);
    if (!group) {
      group = { key, matterId: row.matterId, label, chats: [] };
      map.set(key, group);
      order.push(key);
    }
    group.chats.push(row);
  }
  return order.map((key) => map.get(key)!);
}
