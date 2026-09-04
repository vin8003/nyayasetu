import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isForbiddenCourtUrl, safeCourtUrl } from "./forbidden.ts";
import { buildSteps } from "./steps.ts";

describe("forbidden official eCourts hosts", () => {
  it("blocks services and hcservices eCourts.gov.in", () => {
    assert.equal(isForbiddenCourtUrl("https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index"), true);
    assert.equal(isForbiddenCourtUrl("https://hcservices.ecourts.gov.in/hcservices/main.php"), true);
    assert.equal(safeCourtUrl("https://services.ecourts.gov.in/foo"), "");
    assert.equal(isForbiddenCourtUrl("https://webapi.ecourtsindia.com/api/partner/case/RJJP010000012025"), false);
    assert.equal(isForbiddenCourtUrl("https://judgments.ecourts.gov.in/"), false);
  });
});

describe("import job steps", () => {
  it("never surfaces a CAPTCHA step", () => {
    for (const status of ["CREATED", "SEARCHING", "CAPTCHA_REQUIRED", "COMPLETED", "FAILED"] as const) {
      const steps = buildSteps(status, true);
      assert.equal(steps.some((s) => s.id === "CAPTCHA_REQUIRED"), false);
    }
  });
});
