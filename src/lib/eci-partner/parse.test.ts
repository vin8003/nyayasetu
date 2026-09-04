import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PARTNER_CASE_FIXTURE,
  PARTNER_FLAT_FILES_FIXTURE,
  PARTNER_HEARINGS_ONLY_FIXTURE,
  PARTNER_NESTED_ORDERS_FIXTURE,
} from "./fixture.ts";
import { hasLandableBody, parsePartnerCase } from "./parse.ts";

describe("partner case parse", () => {
  it("prefers markdownContent and does not invent a second body", () => {
    const parsed = parsePartnerCase(PARTNER_CASE_FIXTURE);
    assert.equal(parsed.preview.cnr, "RJJP010000012025");
    assert.match(parsed.preview.title, /SHARMA/i);
    const notice = parsed.orders.find((o) => o.body.includes("Written statement"));
    assert.ok(notice);
    assert.equal(notice?.available, true);
    assert.match(notice?.body ?? "", /Issue notice to the defendant/i);
    const missing = parsed.orders.find((o) => /order-2/i.test(o.externalId) || /order-2/i.test(o.filename));
    assert.ok(missing);
    assert.equal(missing?.available, false);
    assert.equal(missing?.body, "");
  });

  it("does not turn hearings or AI summaries into an order body", () => {
    const withAi = structuredClone(PARTNER_HEARINGS_ONLY_FIXTURE) as typeof PARTNER_HEARINGS_ONLY_FIXTURE & {
      data: { files: { files: Array<Record<string, unknown>> } };
    };
    withAi.data.files = {
      files: [
        {
          pdfFile: "order-x.pdf",
          aiAnalysis: { intelligent_insights_analytics: { ai_generated_executive_summary: "The court did something clever." } },
          markdownContent: "",
        },
      ],
    };
    const parsed = parsePartnerCase(withAi);
    assert.equal(hasLandableBody(parsed.orders), false);
    assert.equal(parsed.orders.every((o) => !o.body.includes("clever")), true);
    assert.equal(parsed.orders.every((o) => !o.body.includes("Written statement")), true);
  });

  it("uses an explicit order description when markdown is missing", () => {
    const parsed = parsePartnerCase(PARTNER_NESTED_ORDERS_FIXTURE);
    assert.equal(parsed.orders.length, 1);
    assert.equal(parsed.orders[0]?.available, true);
    assert.match(parsed.orders[0]?.body ?? "", /Counter affidavit/i);
    assert.equal(parsed.preview.courtName, "Delhi High Court");
  });

  it("returns empty on hearings-only payloads", () => {
    const parsed = parsePartnerCase(PARTNER_HEARINGS_ONLY_FIXTURE);
    assert.equal(hasLandableBody(parsed.orders), false);
  });

  it("does not invent a body from raw HTML or empty JSON", () => {
    const html = parsePartnerCase({ raw: "<html>captcha paste this status</html>" });
    assert.equal(hasLandableBody(html.orders), false);
    assert.equal(html.orders.every((o) => !o.body), true);

    const empty = parsePartnerCase({});
    assert.equal(hasLandableBody(empty.orders), false);
    assert.equal(empty.orders.length, 0);
  });

  it("reads files as a flat array and does not treat COPY OF ORDER as the body", () => {
    const parsed = parsePartnerCase(PARTNER_FLAT_FILES_FIXTURE);
    assert.equal(hasLandableBody(parsed.orders), true);
    const order = parsed.orders.find((o) => o.available);
    assert.ok(order);
    assert.match(order?.body ?? "", /Issue notice to the defendant/i);
    assert.equal((order?.body ?? "").includes("COPY OF ORDER") && order!.body.length < 40, false);
  });
});


