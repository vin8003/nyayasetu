import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { INBOX_DRAFT_KEY, readInboxDraft, writeInboxDraft } from "./inbox-draft.ts";

describe("inbox draft session", () => {
  it("round-trips matter and body, then clears", () => {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    writeInboxDraft({ matterId: "mt_1", body: "Order dated 18 Aug 2026. Plaintiff to prove service.", title: "Order" });
    assert.ok(store.get(INBOX_DRAFT_KEY));
    const once = readInboxDraft();
    assert.equal(once?.matterId, "mt_1");
    assert.match(once?.body ?? "", /prove service/);
    assert.equal(readInboxDraft(), null);
  });
});
