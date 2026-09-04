import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ikAuthHeaders, isIkConfigured, resolveIkApiToken } from "./key.ts";

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
});
