import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nodeHttpsFetch } from "./transport.ts";

describe("indian kanoon transport", () => {
  it("refuses hosts other than api.indiankanoon.org", async () => {
    await assert.rejects(
      () => nodeHttpsFetch("https://services.ecourts.gov.in/status", { method: "GET" }),
      /api\.indiankanoon\.org/,
    );
  });
});
