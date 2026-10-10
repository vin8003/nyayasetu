import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summariseDiagnosis, type DiagStep } from "./diagnose.ts";

const egress: DiagStep = { name: "egress", ok: true, ms: 80, detail: "34.1.2.3 (US, Virginia)" };

describe("summariseDiagnosis", () => {
  it("blames the network path, not the token, when the unauthenticated probe resets", () => {
    const verdict = summariseDiagnosis([
      egress,
      { name: "reach", ok: false, ms: 900, detail: "fetch failed ECONNRESET", code: "ECONNRESET" },
    ]);
    assert.match(verdict, /cannot open a connection/);
    assert.match(verdict, /ECONNRESET/);
    assert.match(verdict, /US, Virginia/);
    assert.match(verdict, /Not a token problem/);
  });

  it("calls out a rejected token", () => {
    const verdict = summariseDiagnosis([
      egress,
      { name: "reach", ok: true, ms: 300, status: 401, detail: "HTTP 401 without a token" },
      { name: "search", ok: false, ms: 300, status: 401, detail: "Indian Kanoon rejected the token." },
    ]);
    assert.match(verdict, /rejected IKANOON_API_TOKEN/);
  });

  it("flags authenticated traffic dying on the network after an unauthenticated 401", () => {
    const verdict = summariseDiagnosis([
      egress,
      { name: "reach", ok: true, ms: 300, status: 401, detail: "HTTP 401 without a token" },
      { name: "search", ok: false, ms: 9000, detail: "Could not reach Indian Kanoon during search (connection reset).", code: "ECONNRESET" },
    ]);
    assert.match(verdict, /authenticated call failed on the network/);
  });

  it("reports success with the document detail", () => {
    const verdict = summariseDiagnosis([
      egress,
      { name: "reach", ok: true, ms: 300, status: 401, detail: "HTTP 401 without a token" },
      { name: "search", ok: true, ms: 1200, status: 200, detail: "3 hit(s); first document 5120 chars" },
    ]);
    assert.match(verdict, /Live fetch works/);
    assert.match(verdict, /3 hit/);
  });

  it("says the token is missing instead of guessing at a network block", () => {
    const verdict = summariseDiagnosis([
      egress,
      { name: "reach", ok: true, ms: 300, status: 401, detail: "HTTP 401 without a token" },
      { name: "search", ok: false, ms: 0, code: "NO_TOKEN", detail: "IKANOON_API_TOKEN is not set on this server" },
    ]);
    assert.match(verdict, /not set on this server/);
    assert.doesNotMatch(verdict, /WAF/);
  });

  it("blames the token, not the network, when Node refuses the header", () => {
    for (const code of ["ERR_INVALID_CHAR", "TOKEN_INVALID_CHARS"]) {
      const verdict = summariseDiagnosis([
        egress,
        { name: "reach", ok: true, ms: 88, status: 401, detail: "HTTP 401 without a token" },
        { name: "search", ok: false, ms: 1, code, detail: "not sent" },
      ]);
      assert.match(verdict, /never sent/);
      assert.match(verdict, /Re-paste the token/);
      assert.doesNotMatch(verdict, /WAF/);
    }
  });
});
