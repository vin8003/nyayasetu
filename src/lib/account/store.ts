import { getSql } from "@/lib/db";

/**
 * App tables keyed by user_id. Children of matters first so FK deletes
 * do not fail if a matter_id constraint is present.
 * Better Auth session/account cascade from "user", but we still drop them
 * explicitly before the user row.
 */
export const ACCOUNT_USER_ID_TABLES = [
  "case_import_records",
  "case_imports",
  "hearings",
  "matter_documents",
  "matter_orders",
  "tasks",
  "deadlines",
  "timeline_events",
  "matters",
  "clients",
  "memos",
  "entitlements",
] as const;

function missingRelation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /does not exist|undefined_table|relation .* does not exist/i.test(msg);
}

/** Wipe a chamber account and its rows. Call only from an admin server fn. */
export async function purgeUserAccount(userId: string): Promise<void> {
  const sql = await getSql();
  const users = await sql<{ email: string | null }>`
    select email from "user" where id = ${userId} limit 1
  `;
  if (!users[0]) throw new Error("Account not found.");
  const email = (users[0].email ?? "").trim();

  // pool.query does not pin a connection, so do not BEGIN/COMMIT across calls.
  for (const table of ACCOUNT_USER_ID_TABLES) {
    try {
      await sql.query(`delete from ${table} where user_id = $1`, [userId]);
    } catch (err) {
      if (!missingRelation(err)) throw err;
    }
  }
  if (email) {
    try {
      await sql.query(`delete from verification where lower(identifier) = lower($1)`, [email]);
    } catch (err) {
      if (!missingRelation(err)) throw err;
    }
  }
  try {
    await sql.query(`delete from "session" where "userId" = $1`, [userId]);
  } catch (err) {
    if (!missingRelation(err)) throw err;
  }
  try {
    await sql.query(`delete from "account" where "userId" = $1`, [userId]);
  } catch (err) {
    if (!missingRelation(err)) throw err;
  }
  await sql.query(`delete from "user" where id = $1`, [userId]);
}
