import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { statuteKey, statutesFromMemos } from "./statute-map.ts";

describe("statutesFromMemos", () => {
  it("dedupes name+section and drops empty names", () => {
    const rows = statutesFromMemos([
      {
        id: "a",
        title: "WS",
        memo: {
          statutes: [
            { name: "Limitation Act, 1963", sections: "Art. 18", why: "goods sold", url: "https://indiankanoon.org/doc/1/" },
            { name: "", sections: "x", why: "", url: "" },
          ],
        },
      },
      {
        id: "b",
        title: "Follow-up",
        memo: {
          statutes: [
            { name: "Limitation Act, 1963", sections: "Art. 18", why: "repeat", url: "" },
            { name: "Commercial Courts Act, 2015", sections: "s.12A", why: "pre-institution", url: "" },
          ],
        },
      },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Limitation Act, 1963");
    assert.equal(rows[0].why, "goods sold");
    assert.equal(rows[1].name, "Commercial Courts Act, 2015");
    assert.equal(statuteKey(rows[0]), "limitation act, 1963|art. 18");
  });
});
