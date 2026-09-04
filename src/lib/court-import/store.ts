import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { COURT_SOURCES } from "./courts.ts";
import { createImportJob, executeSearch, loadJobView } from "./pipeline.ts";
import { getAdapter } from "./adapters.ts";
import { VERIFICATIONS } from "./types.ts";
import { lookupFromMatter } from "./lookup.ts";

const lookupZ = z.record(z.string(), z.string().max(120));

export const listCourtSources = createServerFn({ method: "GET" }).handler(async () => COURT_SOURCES);

export const startCaseImport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        courtId: z.string().min(1).max(40),
        lookup: lookupZ,
        matterId: z.string().min(1).max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const id = await createImportJob(sql, context.userId, {
      courtId: data.courtId,
      lookup: data.lookup,
      matterId: data.matterId ?? null,
    });
    return executeSearch(sql, context.userId, id);
  });

export const getCaseImport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: unknown) => z.string().min(1).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    return loadJobView(sql, context.userId, id);
  });

export const listMatterImports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((matterId: unknown) => z.string().min(1).parse(matterId))
  .handler(async ({ context, data: matterId }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from case_imports
      where user_id = ${context.userId} and matter_id = ${matterId}
      order by updated_at desc
      limit 8
    `;
    const out = [];
    for (const row of rows) {
      const view = await loadJobView(sql, context.userId, row.id);
      if (view) out.push(view);
    }
    return out;
  });

export { lookupFromMatter, guessCourtId } from "./lookup.ts";

export const syncMatterFromCourt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ matterId: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      cnr: string;
      case_number: string;
      court_name: string;
      court_source_id: string;
    }>`
      select cnr, case_number, court_name, court_source_id
      from matters where id = ${data.matterId} and user_id = ${context.userId}
    `;
    if (!rows[0]) throw new Error("Matter not found.");
    const { courtId, lookup } = lookupFromMatter({
      cnr: rows[0].cnr,
      caseNumber: rows[0].case_number,
      courtName: rows[0].court_name,
      courtSourceId: rows[0].court_source_id,
    });
    const adapter = getAdapter(courtId);
    if (!adapter) throw new Error("Unknown court source.");
    const valid = adapter.validate(lookup);
    if (!valid.ok) throw new Error(valid.error);
    const id = await createImportJob(sql, context.userId, {
      courtId,
      lookup,
      matterId: data.matterId,
    });
    return executeSearch(sql, context.userId, id);
  });

export const verifyTimelineEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().min(1),
        verification: z.enum(VERIFICATIONS),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from timeline_events where id = ${data.id} and user_id = ${context.userId}
    `;
    if (!rows[0]) return { ok: false as const };
    await sql`
      update timeline_events set verification = ${data.verification}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });
