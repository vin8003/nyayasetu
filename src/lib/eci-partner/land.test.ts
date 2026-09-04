import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { orderHash } from "../court-import/dedupe.ts";
import { PARTNER_CASE_FIXTURE, PARTNER_HEARINGS_ONLY_FIXTURE } from "./fixture.ts";
import { emptyParseStatus, planInboxLand } from "./land.ts";
import { parsePartnerCase } from "./parse.ts";

describe("partner inbox land plan", () => {
  it("lands markdown orders unconfirmed and fails closed on empty text", () => {
    const parsed = parsePartnerCase(PARTNER_CASE_FIXTURE);
    const plan = planInboxLand(parsed.orders, []);
    assert.equal(plan.toLand.length, 1);
    assert.ok(plan.failed.length >= 1);
    assert.equal(plan.items.every((item) => item.confirmed === false), true);
    assert.equal(plan.toLand[0]?.available, true);
  });

  it("dedupes by hash, external id, and date+title", () => {
    const parsed = parsePartnerCase(PARTNER_CASE_FIXTURE);
    const first = planInboxLand(parsed.orders, []);
    const landed = first.toLand[0]!;
    const byHash = planInboxLand(parsed.orders, [{ contentHash: orderHash(landed) }]);
    assert.equal(byHash.toLand.length, 0);
    assert.ok(byHash.duplicates.length >= 1);

    const byId = planInboxLand(parsed.orders, [{ externalId: landed.externalId }]);
    assert.equal(byId.toLand.length, 0);

    const byFingerprint = planInboxLand(parsed.orders, [
      { orderDate: landed.orderDate, title: landed.title },
    ]);
    assert.equal(byFingerprint.toLand.length, 0);
  });

  it("marks hearings-only as empty / needs_human", () => {
    const parsed = parsePartnerCase(PARTNER_HEARINGS_ONLY_FIXTURE);
    const plan = planInboxLand(parsed.orders, []);
    assert.equal(plan.empty, true);
    assert.equal(emptyParseStatus(plan), "needs_human");
    assert.equal(plan.toLand.length, 0);
  });

  it("uses the Inbox paste path and never auto-confirms", () => {
    const land = readFileSync(new URL("./fetch.server.ts", import.meta.url), "utf8");
    assert.match(land, /insertPastedDocument/);
    assert.match(land, /insertUnconfirmedOrder/);
    assert.match(land, /runExtractOrder/);
    assert.equal(/confirmOrder\(/.test(land), false);
    const store = readFileSync(new URL("../practice/store.ts", import.meta.url), "utf8");
    const insert = store.slice(store.indexOf("export async function insertUnconfirmedOrder"));
    assert.match(insert.slice(0, 800), /confirmed[\s\S]{0,400}false/);
  });
});
