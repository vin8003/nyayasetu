import assert from "node:assert/strict";
import test from "node:test";
import { chatTitle, groupAskChats, type AskChatRow } from "./threads.ts";

test("chats group by case and a case can hold more than one", () => {
  const rows: AskChatRow[] = [
    { id: "2", matterId: "m1", matterTitle: "A v B", title: "Limitation", updatedAt: "2026-04-02" },
    { id: "1", matterId: "m1", matterTitle: "A v B", title: "Next date", updatedAt: "2026-04-01" },
    { id: "3", matterId: null, matterTitle: "", title: "Section 138", updatedAt: "2026-03-01" },
  ];
  const groups = groupAskChats(rows, "General");
  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.label, "A v B");
  assert.deepEqual(
    groups[0]?.chats.map((chat) => chat.id),
    ["2", "1"],
  );
  assert.equal(groups[1]?.label, "General");
  assert.equal(chatTitle("  one line  "), "one line");
});
