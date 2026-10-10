import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAskMarkdown, parseAskMarkdown } from "./markdown.ts";

const SAMPLE =
  "b) Punish the contemnors for wilful disobedience;   c) Direct immediate release of the petitioner;   d) Pass any other order this Hon’ble Court deems fit.  **Place:** Jaipur   **Date:** [Today’s date]  **Petitioner**   **Through**   **Advocate**  ---  Send the demand letter **today**. Once you get any reply (or after 48 hrs), file the contempt petition.  Do you want me to modify any part of these drafts?";

test("lettered items and bold labels become separate lines", () => {
  const text = normalizeAskMarkdown(SAMPLE);
  assert.match(text, /^b\) /);
  assert.match(text, /\nc\) /);
  assert.match(text, /\n\*\*Place:\*\*/);
  assert.match(text, /\n---\n/);
  const blocks = parseAskMarkdown(SAMPLE);
  const list = blocks.find((b) => b.kind === "list");
  assert.ok(list && list.kind === "list");
  assert.deepEqual(
    list.items.map((item) => item.marker),
    ["b.", "c.", "d."],
  );
  assert.ok(blocks.some((b) => b.kind === "hr"));
  const strong = blocks.flatMap((b) => (b.kind === "p" ? b.inlines : []));
  assert.ok(strong.some((part) => part.kind === "strong" && part.text === "Place:"));
  assert.ok(strong.some((part) => part.kind === "strong" && part.text === "today"));
});
