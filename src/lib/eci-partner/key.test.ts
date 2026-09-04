import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isEciConfigured, resolveEciApiKey } from "./key.ts";

describe("partner API key fail-closed", () => {
  it("treats a missing key as unconfigured", () => {
    assert.equal(resolveEciApiKey({}), null);
    assert.equal(resolveEciApiKey({ ECI_API_KEY: "" }), null);
    assert.equal(resolveEciApiKey({ ECI_API_KEY: "   " }), null);
    assert.equal(isEciConfigured({}), false);
  });

  it("rejects a key that is not a live Partner token", () => {
    assert.equal(resolveEciApiKey({ ECI_API_KEY: "sk-not-this" }), null);
    assert.equal(resolveEciApiKey({ ECI_API_KEY: "eci_test_abc" }), null);
  });

  it("accepts an eci_live_ token", () => {
    const key = "eci_live_unit_test_token";
    assert.equal(resolveEciApiKey({ ECI_API_KEY: key }), key);
    assert.equal(isEciConfigured({ ECI_API_KEY: key }), true);
  });
});
