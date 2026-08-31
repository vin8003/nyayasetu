import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_SIGNIN_ERROR } from "./signin.ts";
import { adminEmails, isAdminEmail } from "./allowlist.ts";

describe("admin sign-in policy", () => {
  it("uses one generic error string", () => {
    assert.equal(ADMIN_SIGNIN_ERROR, "Could not sign in.");
    assert.equal(/admin|allowlist|secret/i.test(ADMIN_SIGNIN_ERROR), false);
  });

  it("fails closed when ADMIN_EMAILS is empty", () => {
    const prevA = process.env.ADMIN_EMAILS;
    const prevB = process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
    try {
      assert.deepEqual(adminEmails(), []);
      assert.equal(isAdminEmail("vin8003@gmail.com"), false);
    } finally {
      if (prevA === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = prevA;
      if (prevB === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = prevB;
    }
  });
});
