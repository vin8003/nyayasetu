import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { intakeSchema } from "./schema";
import type { HistoryItem, Intake, LegalMemo } from "./types";

let parentColumnReady = false;

async function ensureParentColumn() {
  if (parentColumnReady) return;
  const sql = await getSql();
  await sql.query("alter table memos add column if not exists parent_id text");
  await sql.query("create index if not exists memos_parent_id_idx on memos (parent_id)");
  parentColumnReady = true;
}

export const listMemos = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureParentColumn();
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      title: string;
      intake_json: string;
      memo_json: string;
      created_at: string;
      parent_id: string | null;
    }>`
      select id, title, intake_json, memo_json, created_at::text as created_at, parent_id
      from memos
      where user_id = ${context.userId}
      order by created_at desc
      limit 40
    `;
    const items: HistoryItem[] = [];
    for (const row of rows) {
      try {
        items.push({
          id: row.id,
          createdAt: row.created_at,
          title: row.title,
          intake: JSON.parse(row.intake_json) as Intake,
          memo: JSON.parse(row.memo_json) as LegalMemo,
          parentId: row.parent_id ?? null,
        });
      } catch {
        /* skip bad row */
      }
    }
    return items;
  });

export const saveMemoRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { intake: Intake; memo: LegalMemo; parentId?: string | null }) => {
    intakeSchema.parse(input.intake);
    return input;
  })
  .handler(async ({ context, data }) => {
    await ensureParentColumn();
    const sql = await getSql();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const title = data.memo.title || "Legal research memo";
    const parentId = data.parentId?.trim() || null;
    await sql`
      insert into memos (id, user_id, title, intake_json, memo_json, parent_id)
      values (
        ${id},
        ${context.userId},
        ${title},
        ${JSON.stringify(data.intake)},
        ${JSON.stringify(data.memo)},
        ${parentId}
      )
    `;
    const item: HistoryItem = {
      id,
      createdAt: new Date().toISOString(),
      title,
      intake: data.intake,
      memo: data.memo,
      parentId,
    };
    return item;
  });

export const deleteMemoRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from memos where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
