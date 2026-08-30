import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { intakeSchema } from "./schema";
import type { HistoryItem, Intake, LegalMemo } from "./types";

let columnsReady = false;

async function ensureMemoColumns() {
  if (columnsReady) return;
  const sql = await getSql();
  await sql.query("alter table memos add column if not exists parent_id text");
  await sql.query("create index if not exists memos_parent_id_idx on memos (parent_id)");
  await sql.query("alter table memos add column if not exists matter_id text");
  await sql.query("create index if not exists memos_matter_id_idx on memos (matter_id)");
  columnsReady = true;
}

const MEMO_COLS = "id, title, intake_json, memo_json, created_at::text as created_at, parent_id, matter_id";

type MemoRow = {
  id: string;
  title: string;
  intake_json: string;
  memo_json: string;
  created_at: string;
  parent_id: string | null;
  matter_id: string | null;
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
        matterId: row.matter_id ?? null,
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
    `select ${MEMO_COLS}
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
            `select ${MEMO_COLS}
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
  .validator((input: { q?: string; matterId?: string } | undefined) => ({
    q: String(input?.q ?? "").trim().slice(0, 200),
    matterId: String(input?.matterId ?? "").trim().slice(0, 80),
  }))
  .handler(async ({ context, data }) => {
    await ensureMemoColumns();
    const sql = await getSql();
    const q = data.q;
    const matterId = data.matterId;
    let seed: MemoRow[];
    if (matterId && q) {
      seed = await sql.query<MemoRow>(
        `select ${MEMO_COLS}
         from memos
         where user_id = $1
           and matter_id = $2
           and (title ilike $3 or intake_json ilike $3 or memo_json ilike $3)
         order by created_at desc
         limit 40`,
        [context.userId, matterId, likeContains(q)],
      );
    } else if (matterId) {
      seed = await sql.query<MemoRow>(
        `select ${MEMO_COLS}
         from memos
         where user_id = $1 and matter_id = $2
         order by created_at desc
         limit 40`,
        [context.userId, matterId],
      );
    } else if (q) {
      seed = await sql.query<MemoRow>(
        `select ${MEMO_COLS}
         from memos
         where user_id = $1
           and (title ilike $2 or intake_json ilike $2 or memo_json ilike $2)
         order by created_at desc
         limit 40`,
        [context.userId, likeContains(q)],
      );
    } else {
      seed = await sql.query<MemoRow>(
        `select ${MEMO_COLS}
         from memos
         where user_id = $1
         order by created_at desc
         limit 80`,
        [context.userId],
      );
    }
    const rows = await hydrateMemoRows(sql, context.userId, seed, Boolean(q) && !matterId);
    return rowsToItems(rows);
  });

export const getMemoRecord = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => String(id ?? "").trim())
  .handler(async ({ context, data: id }) => {
    if (!id) return null;
    await ensureMemoColumns();
    const sql = await getSql();
    const rows = await sql.query<MemoRow>(
      `select ${MEMO_COLS} from memos where user_id = $1 and id = $2 limit 1`,
      [context.userId, id],
    );
    return rowsToItems(rows)[0] ?? null;
  });

export const saveMemoRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { intake: Intake; memo: LegalMemo; parentId?: string | null; matterId?: string | null }) => {
    intakeSchema.parse(input.intake);
    return input;
  })
  .handler(async ({ context, data }) => {
    await ensureMemoColumns();
    const sql = await getSql();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const title = data.memo.title || "Legal research memo";
    const parentId = data.parentId?.trim() || null;
    const matterId = data.matterId?.trim() || null;
    await sql`
      insert into memos (id, user_id, title, intake_json, memo_json, parent_id, matter_id)
      values (
        ${id},
        ${context.userId},
        ${title},
        ${JSON.stringify(data.intake)},
        ${JSON.stringify(data.memo)},
        ${parentId},
        ${matterId}
      )
    `;
    const item: HistoryItem = {
      id,
      createdAt: new Date().toISOString(),
      title,
      intake: data.intake,
      memo: data.memo,
      parentId,
      matterId,
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
