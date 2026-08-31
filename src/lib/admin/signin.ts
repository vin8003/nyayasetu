import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { adminConfigured, isAdminEmail } from "./allowlist";

/** Shown for every failure. Do not distinguish wrong password vs not-admin. */
export const ADMIN_SIGNIN_ERROR = "Could not sign in.";

function pickToken(payload: unknown): string {
  const rec = (payload ?? {}) as Record<string, unknown>;
  const headers = rec.headers;
  if (headers instanceof Headers) {
    const fromHeader = headers.get("set-auth-token") ?? "";
    if (fromHeader) return fromHeader;
  } else if (headers && typeof headers === "object") {
    const h = headers as Record<string, unknown>;
    const raw = h["set-auth-token"] ?? h["Set-Auth-Token"];
    if (typeof raw === "string" && raw) return raw;
  }
  const nested = rec.response as Record<string, unknown> | undefined;
  if (typeof nested?.token === "string" && nested.token) return nested.token;
  if (typeof rec.token === "string" && rec.token) return rec.token;
  return "";
}

export type AdminSignInResult =
  | { ok: true; token: string; email: string }
  | { ok: false; error: string };

/**
 * Admin login only. Password sign-in, then allowlist. If the password is
 * valid but the email is not on ADMIN_EMAILS, the new session is dropped.
 */
export const adminSignIn = createServerFn({ method: "POST" })
  .validator((input: { email?: string; password?: string }) => ({
    email: String(input?.email ?? "").trim().toLowerCase(),
    password: String(input?.password ?? ""),
  }))
  .handler(async ({ data }): Promise<AdminSignInResult> => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();

    if (!adminConfigured() || !data.email.includes("@") || data.password.length < 8) {
      return { ok: false, error: ADMIN_SIGNIN_ERROR };
    }

    try {
      const { auth } = await import("@/lib/auth/server");
      const result = await auth.api.signInEmail({
        body: { email: data.email, password: data.password },
        returnHeaders: true,
      });
      const token = pickToken(result);
      if (!token) return { ok: false, error: ADMIN_SIGNIN_ERROR };

      if (!isAdminEmail(data.email)) {
        try {
          await auth.api.signOut({
            headers: new Headers({ Authorization: `Bearer ${token}` }),
          });
        } catch {
          /* still drop the row */
        }
        try {
          const sql = await getSql();
          await sql.query(`delete from "session" where token = $1`, [token]);
        } catch {
          /* token may be hashed — signOut above is the real clear */
        }
        return { ok: false, error: ADMIN_SIGNIN_ERROR };
      }

      return { ok: true, token, email: data.email };
    } catch {
      return { ok: false, error: ADMIN_SIGNIN_ERROR };
    }
  });
