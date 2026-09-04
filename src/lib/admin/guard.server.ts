import { UnauthorizedError } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { adminConfigured, isAdminEmail } from "./allowlist";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin(userId: string): Promise<{ id: string; email: string }> {
  if (!userId) throw new UnauthorizedError();
  if (!adminConfigured()) throw new ForbiddenError("Admin is not configured.");
  const sql = await getSql();
  const rows = await sql<{ email: string | null }>`
    select email from "user" where id = ${userId} limit 1
  `;
  const email = (rows[0]?.email ?? "").trim().toLowerCase();
  if (!isAdminEmail(email)) throw new ForbiddenError("Not an admin.");
  return { id: userId, email };
}
