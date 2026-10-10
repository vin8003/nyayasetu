import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ikAuthHeaders, isIkConfigured, resolveIkApiToken, resolveIkTokenStatus } from "./key.ts";

describe("indian kanoon token", () => {
  it("fail-closes when the token is missing or a PEM", () => {
    assert.equal(resolveIkApiToken({}), null);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: "   " }), null);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: "short" }), null);
    assert.equal(
      resolveIkApiToken({ IKANOON_API_TOKEN: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----" }),
      null,
    );
    assert.equal(isIkConfigured({}), false);
  });

  it("accepts IKANOON_API_TOKEN and the IKANOON_TOKEN alias", () => {
    const token = "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b";
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `Token ${token}` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `"${token}"` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_TOKEN: `  ${token}  ` }), token);
    assert.equal(ikAuthHeaders(token).Authorization, `Token ${token}`);
    assert.equal(isIkConfigured({ IKANOON_API_TOKEN: token }), true);
  });

  it("cleans pasted line breaks, NBSP, zero-width marks and curly quotes", () => {
    const token = "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b";
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `${token}\r\n` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `${token.slice(0, 20)}\n${token.slice(20)}` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `\u201C${token}\u201D` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `\u200B${token}\u00A0` }), token);
    assert.equal(resolveIkApiToken({ IKANOON_API_TOKEN: `Token\u00A0${token}` }), token);
  });

  it("refuses a token that still cannot go in a header, and names the code point not the token", () => {
    const status = resolveIkTokenStatus({ IKANOON_API_TOKEN: "9944b09199c62bcf\u20139418ad846dd0e4bbdfc6ee4b" });
    assert.equal(status.token, null);
    assert.equal(status.problem, "invalid_chars");
    if (status.problem !== "invalid_chars") return;
    assert.match(status.detail, /U\+2013/);
    assert.doesNotMatch(status.detail, /9944b/);
  });
});
