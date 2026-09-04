import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderMarkdownUrl } from "./client.ts";
import { PARTNER_DLHC_VIEW_ORDER_FIXTURE } from "./fixture.ts";
import { hydrateOrderMarkdown } from "./hydrate.ts";
import { jsonResponse, mockPartnerFetch, PARTNER_TEST_HOST } from "./mock.ts";
import { hasLandableBody, parsePartnerCase, pendingOrderPdfs } from "./parse.ts";

const KEY = "eci_live_unit_test_token";
const ORDER_BODY = `IN THE HIGH COURT OF DELHI AT NEW DELHI
W.P.(C) 3418/2026
Spherion Solutions Private Limited v Additional Commissioner
Dated 17 March 2026

Issue notice. Counter affidavit be filed within four weeks. List on 23.03.2026.`;

describe("partner order-md hydrate", () => {
  it("does not treat View ORDER stubs as a body", () => {
    const parsed = parsePartnerCase(PARTNER_DLHC_VIEW_ORDER_FIXTURE);
    assert.equal(hasLandableBody(parsed.orders), false);
    assert.deepEqual(pendingOrderPdfs(parsed.orders), ["order-1.pdf", "order-2.pdf"]);
    assert.equal(parsed.orders.every((o) => !/View ORDER/i.test(o.body) || o.body.length < 20), true);
  });

  it("fills bodies from mocked order-md and never hits live Partner", async () => {
    const parsed = parsePartnerCase(PARTNER_DLHC_VIEW_ORDER_FIXTURE);
    const { calls, fetchImpl } = mockPartnerFetch((call) => {
      assert.match(call.url, /^https:\/\/webapi\.ecourtsindia\.com\/api\/partner\/case\/DLHC010097752026\/order-md\/order-[12]\.pdf$/);
      return jsonResponse({ data: { markdownContent: ORDER_BODY }, meta: { request_id: "md1" } });
    });
    const result = await hydrateOrderMarkdown({
      cnr: "DLHC010097752026",
      apiKey: KEY,
      orders: parsed.orders,
      fetchImpl,
    });
    assert.equal(result.attempted, 2);
    assert.equal(result.filled, 2);
    assert.equal(hasLandableBody(parsed.orders), true);
    assert.match(parsed.orders[0]?.body ?? "", /Issue notice/i);
    assert.equal(calls.every((c) => c.url.startsWith(PARTNER_TEST_HOST)), true);
    assert.equal(orderMarkdownUrl("DLHC010097752026", "order-1.pdf"), `${PARTNER_TEST_HOST}/api/partner/case/DLHC010097752026/order-md/order-1.pdf`);
  });

  it("stays empty when order-md has no markdown", async () => {
    const parsed = parsePartnerCase(PARTNER_DLHC_VIEW_ORDER_FIXTURE);
    const { fetchImpl } = mockPartnerFetch(() => jsonResponse({ data: { markdownContent: null } }));
    const result = await hydrateOrderMarkdown({
      cnr: "DLHC010097752026",
      apiKey: KEY,
      orders: parsed.orders,
      fetchImpl,
    });
    assert.equal(result.filled, 0);
    assert.equal(hasLandableBody(parsed.orders), false);
  });
});
