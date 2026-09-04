import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAdapter, listAdapterStatus } from "./registry.ts";
import { noneAdapter } from "./adapters/none.ts";
import { DEFAULT_COURT_PROVIDER_ID, parseProviderId } from "./types.ts";

describe("court provider registry", () => {
  it("defaults empty settings to eCourtsIndia and unknown ids to off", () => {
    assert.equal(parseProviderId(""), DEFAULT_COURT_PROVIDER_ID);
    assert.equal(parseProviderId(null), "eci_partner");
    assert.equal(parseProviderId("eci_partner"), "eci_partner");
    assert.equal(parseProviderId("indiankanoon"), "indiankanoon");
    assert.equal(parseProviderId("none"), "none");
    assert.equal(parseProviderId("mystery-api"), "none");
  });

  it("resolves adapters and lists one active row", () => {
    assert.equal(getAdapter("eci_partner").id, "eci_partner");
    assert.equal(getAdapter("indiankanoon").id, "indiankanoon");
    assert.equal(getAdapter("none").id, "none");
    assert.equal(getAdapter("not-a-provider").id, "none");
    const rows = listAdapterStatus("eci_partner");
    assert.equal(rows.some((r) => r.id === "eci_partner" && r.active), true);
    assert.equal(rows.some((r) => r.id === "indiankanoon"), true);
  });

  it("off adapter fail-closes without inventing a body", async () => {
    const result = await noneAdapter.fetchCnr({ userId: "u1", cnr: "DLHC010097752026" });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "PROVIDER_DISABLED");
    assert.equal(result.status, "fetch_error");
  });
});
