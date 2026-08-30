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

type MemoRow = {
  id: string;
  title: string;
  intake_json: string;
  memo_json: string;
  created_at: string;
  parent_id: string | null;
};

function rowsToItems(rows: MemoRow[]): HistoryItem[] {
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
}

function likeContains(q: string): string {
  const cleaned = q.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim();
  return `%${cleaned}%`;
}

async function fetchMemosByIds(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  ids: string[],
): Promise<MemoRow[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
  return sql.query<MemoRow>(
    `select id, title, intake_json, memo_json, created_at::text as created_at, parent_id
     from memos
     where user_id = $1 and id in (${placeholders})
     order by created_at desc`,
    [userId, ...ids],
  );
}

async function hydrateMemoRows(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  seed: MemoRow[],
  includeChildren: boolean,
): Promise<MemoRow[]> {
  const byId = new Map(seed.map((row) => [row.id, row]));
  for (let hop = 0; hop < 5 && byId.size < 120; hop += 1) {
    const missingParents = [...byId.values()]
      .map((row) => row.parent_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0 && !byId.has(id));
    const ids = [...byId.keys()];
    const extraChildren =
      includeChildren && ids.length > 0
        ? await sql.query<MemoRow>(
            `select id, title, intake_json, memo_json, created_at::text as created_at, parent_id
             from memos
             where user_id = $1 and parent_id in (${ids.map((_, i) => `$${i + 2}`).join(", ")})`,
            [userId, ...ids],
          )
        : [];
    const extraParents = await fetchMemosByIds(sql, userId, missingParents);
    let grew = false;
    for (const row of [...extraChildren, ...extraParents]) {
      if (!byId.has(row.id)) {
        byId.set(row.id, row);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const listMemos = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { q?: string } | undefined) => ({
    q: String(input?.q ?? "").trim().slice(0, 200),
  }))
  .handler(async ({ context, data }) => {
    await ensureParentColumn();
    const sql = await getSql();
    const q = data.q;
    const seed = q
      ? await sql.query<MemoRow>(
          `select id, title, intake_json, memo_json, created_at::text as created_at, parent_id
           from memos
           where user_id = $1
             and (
               title ilike $2
               or intake_json ilike $2
               or memo_json ilike $2
             )
           order by created_at desc
           limit 40`,
          [context.userId, likeContains(q)],
        )
      : await sql.query<MemoRow>(
          `select id, title, intake_json, memo_json, created_at::text as created_at, parent_id
           from memos
           where user_id = $1
           order by created_at desc
           limit 80`,
          [context.userId],
        );
    const rows = await hydrateMemoRows(sql, context.userId, seed, Boolean(q));
    return rowsToItems(rows);
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
