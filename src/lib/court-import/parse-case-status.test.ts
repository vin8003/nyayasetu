import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCaseStatusText } from "./parse-case-status.ts";
import { SAMPLE_ECOURTS_PASTE } from "./fixtures.ts";
import { buildSteps } from "./steps.ts";

describe("pasted eCourts case status", () => {
  it("normalizes metadata and history rows", () => {
    const parsed = parseCaseStatusText(SAMPLE_ECOURTS_PASTE, {
      courtId: "district-ecourts",
      courtName: "District courts (eCourts)",
      officialUrl: "https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index",
    });
    assert.ok(parsed);
    assert.equal(parsed!.case.cnr, "DLST010099882025");
    assert.equal(parsed!.case.caseNumber, "CS 90/2025");
    assert.equal(parsed!.case.filingNumber, "88/2025");
    assert.equal(parsed!.case.nextHearingOn, "2026-09-30");
    assert.ok(parsed!.orders.length >= 3);
    assert.ok(parsed!.case.sourceUrl.includes("ecourts.gov.in"));
  });
});

describe("import job steps", () => {
  it("marks CAPTCHA as the active step", () => {
    const steps = buildSteps("CAPTCHA_REQUIRED", true);
    const captcha = steps.find((s) => s.id === "CAPTCHA_REQUIRED");
    assert.ok(captcha?.active);
    assert.equal(steps.find((s) => s.id === "SEARCHING")?.done, true);
  });

  it("hides CAPTCHA when the demo path completed", () => {
    const steps = buildSteps("COMPLETED", false);
    assert.equal(steps.some((s) => s.id === "CAPTCHA_REQUIRED"), false);
    assert.ok(steps.at(-1)?.done || steps.at(-1)?.id === "COMPLETED");
  });
});
