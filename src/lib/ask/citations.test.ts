import assert from "node:assert/strict";
import test from "node:test";
import { groundAskReply } from "./citations.ts";

test("keeps a retrieved Indian Kanoon link and drops an invented reporter", () => {
  const raw =
    "Section 138 NI Act still needs a notice. See [Dashrath Rupsingh](https://indiankanoon.org/doc/123/) and also Imaginary v State (2019) 4 SCC 99. https://example.com/fake";
  const grounded = groundAskReply(raw, ["https://www.indiankanoon.org/doc/123"]);
  assert.match(grounded.text, /indiankanoon\.org\/doc\/123/);
  assert.doesNotMatch(grounded.text, /example\.com/);
  assert.doesNotMatch(grounded.text, /2019\) 4 SCC 99/);
  assert.match(grounded.text, /left out because this search did not retrieve it/);
  assert.deepEqual(grounded.sources, ["https://indiankanoon.org/doc/123"]);
  assert.match(grounded.text, /Section 138/);
});

test("an unretrieved markdown link is not cited", () => {
  const grounded = groundAskReply("Follow [Puttaswamy](https://indiankanoon.org/doc/999).", []);
  assert.doesNotMatch(grounded.text, /Puttaswamy/);
  assert.doesNotMatch(grounded.text, /doc\/999/);
  assert.deepEqual(grounded.sources, []);
});
