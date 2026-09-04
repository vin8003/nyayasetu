import type { Sql } from "@/lib/db";
import { newId, todayISO } from "@/lib/practice/ids";
import { defaultStage } from "@/lib/practice/workflow";
import { getAdapter, searchCourt } from "./adapters.ts";
import { enrichChronology } from "./analyse.ts";
import { buildChronology, eventKey } from "./chronology.ts";
import { extractDeadlines } from "./deadlines.ts";
import { orderHash, partitionOrders, type ExistingRecord } from "./dedupe.ts";
import { importLog } from "./log.ts";
import { captionFromParties } from "./proceeding.ts";
import { emptySummary, type ImportJobView, type ImportStatus, type ImportSummary, type NormalizedCase, type NormalizedOrder } from "./types.ts";
import { buildSteps } from "./steps.ts";
import { safeCourtUrl } from "./forbidden.ts";
import { formatCaseNumber } from "./validate.ts";

type JobRow = {
  id: string;
  user_id: string;
  matter_id: string | null;
  court_id: string;
  case_number: string;
  cnr: string;
  lookup_json: string;
  status: string;
  stage_note: string;
  summary_json: string;
  error: string;
  official_url: string;
  captcha_required: boolean;
  demo: boolean;
  updated_at: string;
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setJob(
  sql: Sql,
  userId: string,
  id: string,
  patch: Partial<{
    status: ImportStatus;
    stageNote: string;
    summary: ImportSummary;
    error: string;
    officialUrl: string;
    captchaRequired: boolean;
    demo: boolean;
    matterId: string | null;
    caseNumber: string;
    cnr: string;
  }>,
): Promise<void> {
  const rows = await sql<JobRow>`select * from case_imports where id = ${id} and user_id = ${userId}`;
  const cur = rows[0];
  if (!cur) return;
  const summary = patch.summary ? JSON.stringify(patch.summary) : cur.summary_json;
  await sql`
    update case_imports set
      status = ${patch.status ?? cur.status},
      stage_note = ${patch.stageNote ?? cur.stage_note},
      summary_json = ${summary},
      error = ${patch.error ?? cur.error},
      official_url = ${patch.officialUrl ?? cur.official_url},
      captcha_required = ${patch.captchaRequired ?? cur.captcha_required},
      demo = ${patch.demo ?? cur.demo},
      matter_id = ${patch.matterId === undefined ? cur.matter_id : patch.matterId},
      case_number = ${patch.caseNumber ?? cur.case_number},
      cnr = ${patch.cnr ?? cur.cnr},
      updated_at = now()
    where id = ${id} and user_id = ${userId}
  `;
}

export async function loadJobView(sql: Sql, userId: string, id: string): Promise<ImportJobView | null> {
  const rows = await sql<JobRow>`select * from case_imports where id = ${id} and user_id = ${userId}`;
  const job = rows[0];
  if (!job) return null;
  const records = await sql<{
    id: string;
    kind: string;
    title: string;
    order_date: string | null;
    status: string;
    source_url: string;
    document_id: string | null;
    error: string;
  }>`
    select id, kind, title, order_date, status, source_url, document_id, error
    from case_import_records
    where import_id = ${id} and user_id = ${userId}
    order by coalesce(order_date, '1970-01-01') asc, created_at asc
  `;
  const lookup = parseJson<Record<string, string>>(job.lookup_json, {});
  const summary = parseJson<ImportSummary>(job.summary_json, emptySummary());
  const adapter = getAdapter(job.court_id);
  const status = job.status as ImportStatus;
  let casePreview = null;
  if (job.matter_id) {
    const matters = await sql<{
      title: string;
      court_name: string;
      case_number: string;
      cnr: string;
      parties_json: string;
      status: string;
      stage: string;
      next_hearing_on: string | null;
      source_url: string;
    }>`select title, court_name, case_number, cnr, parties_json, status, stage, next_hearing_on, source_url
      from matters where id = ${job.matter_id} and user_id = ${userId}`;
    const m = matters[0];
    if (m) {
      const parties = parseJson<Array<{ role: string; name: string }>>(m.parties_json, []);
      casePreview = {
        title: m.title,
        courtName: m.court_name,
        caseNumber: m.case_number,
        cnr: m.cnr,
        parties: parties.map((p) => `${p.role}: ${p.name}`).join("; "),
        status: m.status,
        stage: m.stage,
        nextHearingOn: m.next_hearing_on,
        sourceUrl: safeCourtUrl(m.source_url),
      };
    }
  }
  return {
    id: job.id,
    matterId: job.matter_id,
    courtId: job.court_id,
    courtName: adapter?.name ?? job.court_id,
    status,
    stageNote: job.stage_note,
    officialUrl: safeCourtUrl(job.official_url),
    captchaRequired: false,
    demo: Boolean(job.demo),
    error: job.error,
    lookup,
    casePreview,
    summary,
    steps: buildSteps(status, false),
    records: records.map((r) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      orderDate: r.order_date,
      status: r.status,
      sourceUrl: safeCourtUrl(r.source_url),
      documentId: r.document_id,
      error: r.error,
    })),
    updatedAt: String(job.updated_at ?? ""),
  };
}

async function existingForMatter(sql: Sql, userId: string, matterId: string): Promise<ExistingRecord[]> {
  const docs = await sql<{ external_id: string; content_hash: string; title: string }>`
    select external_id, content_hash, title from matter_documents
    where matter_id = ${matterId} and user_id = ${userId}
  `;
  const recs = await sql<{ external_id: string; content_hash: string; title: string; order_date: string | null }>`
    select external_id, content_hash, title, order_date from case_import_records
    where matter_id = ${matterId} and user_id = ${userId} and status = 'imported'
  `;
  return [
    ...docs.map((d) => ({ externalId: d.external_id, contentHash: d.content_hash, title: d.title })),
    ...recs.map((d) => ({
      externalId: d.external_id,
      contentHash: d.content_hash,
      title: d.title,
      orderDate: d.order_date,
    })),
  ];
}

async function ensureMatter(
  sql: Sql,
  userId: string,
  matterId: string | null,
  cse: NormalizedCase,
  courtId: string,
): Promise<string> {
  const title = captionFromParties(cse.parties, cse.caseNumber || cse.cnr || "Imported matter");
  const stage = cse.stage || defaultStage(cse.proceeding);
  if (matterId) {
    const rows = await sql<{ id: string; title: string; notes: string }>`
      select id, title, notes from matters where id = ${matterId} and user_id = ${userId}
    `;
    if (!rows[0]) throw new Error("Matter not found.");
    const keepTitle = rows[0].title && !/^CS |^W\.P|^Bail |^CWP /i.test(rows[0].title) && rows[0].title.length > 8
      ? rows[0].title
      : title;
    const notes = rows[0].notes?.trim() ? rows[0].notes : cse.notes;
    await sql`
      update matters set
        title = ${keepTitle},
        court_name = ${cse.courtName},
        case_number = ${cse.caseNumber},
        cnr = ${cse.cnr},
        case_type = ${cse.caseType},
        jurisdiction = ${cse.jurisdiction},
        parties_json = ${JSON.stringify(cse.parties)},
        stage = ${stage},
        proceeding = ${cse.proceeding},
        next_hearing_on = ${cse.nextHearingOn},
        last_order_on = ${cse.lastOrderOn},
        notes = ${notes},
        source_url = ${cse.sourceUrl},
        court_source_id = ${courtId},
        last_synced_at = now(),
        import_status = ${"imported"},
        updated_at = now()
      where id = ${matterId} and user_id = ${userId}
    `;
    return matterId;
  }
  const id = newId("mt");
  await sql`
    insert into matters (
      id, user_id, title, proceeding, stage, court_name, case_number, cnr,
      case_type, jurisdiction, our_side, parties_json, notes, next_hearing_on, last_order_on,
      source_url, court_source_id, last_synced_at, import_status
    ) values (
      ${id}, ${userId}, ${title}, ${cse.proceeding}, ${stage}, ${cse.courtName}, ${cse.caseNumber}, ${cse.cnr},
      ${cse.caseType}, ${cse.jurisdiction}, ${"petitioner"}, ${JSON.stringify(cse.parties)}, ${cse.notes},
      ${cse.nextHearingOn}, ${cse.lastOrderOn}, ${cse.sourceUrl}, ${courtId}, now(), ${"imported"}
    )
  `;
  await sql`
    insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, verification)
    values (
      ${newId("ev")}, ${userId}, ${id}, ${cse.filingDate || todayISO()}, ${"stage"}, ${"Matter imported from court"},
      ${`${cse.courtName} · ${cse.caseNumber || cse.cnr}`}, ${"system"}, ${"court_imported"}
    )
  `;
  return id;
}

async function writeRecord(
  sql: Sql,
  userId: string,
  importId: string,
  matterId: string,
  order: NormalizedOrder,
  status: string,
  extra: { documentId?: string | null; orderId?: string | null; error?: string },
): Promise<string> {
  const id = newId("ir");
  await sql`
    insert into case_import_records (
      id, user_id, import_id, matter_id, kind, external_id, order_date, title, source_url,
      content_hash, body, status, document_id, order_id, error, retrieved_at
    ) values (
      ${id}, ${userId}, ${importId}, ${matterId}, ${"order"}, ${order.externalId}, ${order.orderDate},
      ${order.title}, ${order.sourceUrl}, ${orderHash(order)}, ${order.body.slice(0, 40000)},
      ${status}, ${extra.documentId ?? null}, ${extra.orderId ?? null}, ${extra.error ?? order.error ?? ""},
      now()
    )
  `;
  return id;
}

async function persistHistory(
  sql: Sql,
  userId: string,
  importId: string,
  matterId: string,
  cse: NormalizedCase,
  orders: NormalizedOrder[],
  demo: boolean,
): Promise<ImportSummary> {
  const summary = emptySummary();
  summary.caseDetails = "imported";
  summary.found = orders.length;
  const existing = await existingForMatter(sql, userId, matterId);
  const { imported, duplicates, failed } = partitionOrders(orders, existing);
  summary.duplicates = duplicates.length;
  summary.failed = failed.length;

  for (const order of duplicates) {
    await writeRecord(sql, userId, importId, matterId, order, "duplicate", {});
  }
  for (const order of failed) {
    await writeRecord(sql, userId, importId, matterId, order, "failed", { error: order.error || "Unavailable from court source." });
  }

  const docByExternal = new Map<string, string>();
  for (const order of imported) {
    const docId = newId("dc");
    await sql`
      insert into matter_documents (
        id, user_id, matter_id, kind, title, body, source_kind, source_url, external_id, content_hash, retrieved_at
      ) values (
        ${docId}, ${userId}, ${matterId}, ${"order"}, ${order.title}, ${order.body.slice(0, 40000)},
        ${"court_import"}, ${order.sourceUrl}, ${order.externalId}, ${orderHash(order)}, now()
      )
    `;
    const orderId = newId("or");
    await sql`
      insert into matter_orders (
        id, user_id, matter_id, document_id, order_date, body, directions_json, confirmed
      ) values (
        ${orderId}, ${userId}, ${matterId}, ${docId}, ${order.orderDate}, ${order.body.slice(0, 40000)}, ${"[]"}, true
      )
    `;
    await writeRecord(sql, userId, importId, matterId, order, "imported", { documentId: docId, orderId });
    docByExternal.set(order.externalId, docId);
    if (order.orderDate) {
      await sql`
        insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id, verification)
        values (
          ${newId("ev")}, ${userId}, ${matterId}, ${order.orderDate}, ${"document"}, ${order.title},
          ${"Original court record imported."}, ${"court_direction"}, ${docId}, ${"court_imported"}
        )
      `;
    }
    summary.imported += 1;
  }

  const chronology = buildChronology(orders.filter((o) => o.available));
  let extra: typeof chronology = [];
  if (!demo) extra = await enrichChronology(imported, chronology);
  const events = [...chronology, ...extra];
  summary.analysed = imported.length;
  const existingEvents = await sql<{ happened_on: string; title: string }>`
    select happened_on, title from timeline_events where matter_id = ${matterId} and user_id = ${userId}
  `;
  const have = new Set(existingEvents.map((e) => eventKey({ happenedOn: e.happened_on, title: e.title })));
  let timelineCount = 0;
  for (const event of events) {
    const key = eventKey(event);
    if (have.has(key)) continue;
    const ref = [...docByExternal.values()][0] ?? null;
    const matchedDoc =
      imported.find((o) => o.title === event.sourceTitle || o.orderDate === event.happenedOn) ?? null;
    const refId = (matchedDoc && docByExternal.get(matchedDoc.externalId)) || ref;
    const detail = [event.detail, event.quote && `Source: ${event.sourceTitle}`, event.quote && `"${event.quote}"`]
      .filter(Boolean)
      .join("\n\n");
    await sql`
      insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id, verification)
      values (
        ${newId("ev")}, ${userId}, ${matterId}, ${event.happenedOn}, ${event.kind}, ${event.title},
        ${detail.slice(0, 4000)}, ${event.origin}, ${refId}, ${event.verification}
      )
    `;
    have.add(key);
    timelineCount += 1;
  }
  summary.timelineEvents = timelineCount;

  const deadlines = extractDeadlines(orders, events, cse);
  const existingDl = await sql<{ title: string; due_on: string }>`
    select title, due_on from deadlines where matter_id = ${matterId} and user_id = ${userId}
  `;
  const dlHave = new Set(existingDl.map((d) => `${d.due_on}|${d.title.toLowerCase()}`));
  let dlCount = 0;
  for (const d of deadlines) {
    const key = `${d.dueOn}|${d.title.toLowerCase()}`;
    if (dlHave.has(key)) continue;
    await sql`
      insert into deadlines (id, user_id, matter_id, title, due_on, origin, source_quote)
      values (${newId("dl")}, ${userId}, ${matterId}, ${d.title.slice(0, 240)}, ${d.dueOn}, ${d.origin}, ${d.sourceQuote.slice(0, 500)})
    `;
    if (/file |comply|pay process|affidavit/i.test(d.title)) {
      await sql`
        insert into tasks (id, user_id, matter_id, title, origin, due_on, source_quote)
        values (${newId("tk")}, ${userId}, ${matterId}, ${d.title.slice(0, 240)}, ${d.origin}, ${d.dueOn}, ${d.sourceQuote.slice(0, 500)})
      `;
    }
    dlHave.add(key);
    dlCount += 1;
  }
  summary.deadlines = dlCount;

  if (cse.nextHearingOn) {
    const listed = await sql<{ id: string }>`
      select id from hearings where matter_id = ${matterId} and user_id = ${userId} and listed_on = ${cse.nextHearingOn}
    `;
    if (!listed[0]) {
      const hid = newId("hr");
      await sql`
        insert into hearings (id, user_id, matter_id, listed_on, purpose, stage, bench)
        values (${hid}, ${userId}, ${matterId}, ${cse.nextHearingOn}, ${"As per court status"}, ${cse.stage}, ${cse.judge})
      `;
      await sql`
        insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id, verification)
        values (
          ${newId("ev")}, ${userId}, ${matterId}, ${cse.nextHearingOn}, ${"hearing"}, ${"Next hearing listed"},
          ${cse.judge || cse.courtEstablishment}, ${"court_direction"}, ${hid}, ${"court_imported"}
        )
      `;
    }
  }

  summary.lastSyncedAt = new Date().toISOString();
  return summary;
}

export async function runFoundResult(
  sql: Sql,
  userId: string,
  jobId: string,
  cse: NormalizedCase,
  orders: NormalizedOrder[],
  demo: boolean,
): Promise<ImportJobView> {
  importLog("retrieving_case", { jobId, court: cse.courtId, caseNumber: cse.caseNumber, demo, found: orders.length });
  await setJob(sql, userId, jobId, {
    status: "RETRIEVING_CASE",
    stageNote: "Case details retrieved.",
    demo,
    caseNumber: cse.caseNumber,
    cnr: cse.cnr,
    captchaRequired: false,
    error: "",
  });
  const job = (await sql<JobRow>`select * from case_imports where id = ${jobId} and user_id = ${userId}`)[0];
  const matterId = await ensureMatter(sql, userId, job?.matter_id ?? null, cse, cse.courtId);
  await setJob(sql, userId, jobId, {
    matterId,
    status: "RETRIEVING_HISTORY",
    stageNote: `${orders.length} historical records found.`,
  });
  await setJob(sql, userId, jobId, { status: "DOWNLOADING_ORDERS", stageNote: "Importing original court records." });
  await setJob(sql, userId, jobId, { status: "DEDUPLICATING", stageNote: "Skipping records already on the file." });
  await setJob(sql, userId, jobId, { status: "ANALYSING", stageNote: "Reading orders into a chronology." });
  const summary = await persistHistory(sql, userId, jobId, matterId, cse, orders, demo);
  await setJob(sql, userId, jobId, { status: "BUILDING_TIMELINE", stageNote: "Writing timeline and deadlines." });
  const terminal: ImportStatus = summary.failed > 0 || summary.imported === 0 ? "PARTIAL" : "COMPLETED";
  if (summary.imported === 0 && summary.failed > 0 && summary.duplicates === 0 && orders.every((o) => !o.available)) {
    summary.caseDetails = "partial";
  }
  await setJob(sql, userId, jobId, {
    status: terminal,
    stageNote:
      terminal === "PARTIAL"
        ? "Imported what the court source made available. Some records could not be retrieved."
        : "Case reconstructed.",
    summary,
    matterId,
  });
  importLog("completed", {
    jobId,
    matterId,
    status: terminal,
    imported: summary.imported,
    duplicates: summary.duplicates,
    failed: summary.failed,
    timelineEvents: summary.timelineEvents,
    deadlines: summary.deadlines,
  });
  const view = await loadJobView(sql, userId, jobId);
  if (!view) throw new Error("Import job missing after persist.");
  return view;
}

export async function executeSearch(
  sql: Sql,
  userId: string,
  jobId: string,
): Promise<ImportJobView> {
  const job = (await sql<JobRow>`select * from case_imports where id = ${jobId} and user_id = ${userId}`)[0];
  if (!job) throw new Error("Import job not found.");
  const lookup = parseJson<Record<string, string>>(job.lookup_json, {});
  await setJob(sql, userId, jobId, { status: "CONNECTING", stageNote: "Looking up the case." });
  await setJob(sql, userId, jobId, { status: "SEARCHING", stageNote: "Looking up the case." });
  const result = searchCourt(job.court_id, lookup);
  if (result.kind !== "found") {
    const message =
      result.kind === "error"
        ? result.message
        : "Live CNR fetch uses the eCourtsIndia Partner API. CiteBench does not open the court CAPTCHA page.";
    await setJob(sql, userId, jobId, {
      status: "FAILED",
      stageNote: message,
      officialUrl: "",
      captchaRequired: false,
      error: message,
    });
    const view = await loadJobView(sql, userId, jobId);
    if (!view) throw new Error("Import job missing.");
    return view;
  }
  return runFoundResult(sql, userId, jobId, result.case, result.orders, result.demo);
}

export async function createImportJob(
  sql: Sql,
  userId: string,
  input: { courtId: string; lookup: Record<string, string>; matterId?: string | null },
): Promise<string> {
  const adapter = getAdapter(input.courtId);
  if (!adapter) throw new Error("Unknown court source.");
  const valid = adapter.validate(input.lookup);
  if (!valid.ok) throw new Error(valid.error);
  if (input.matterId) {
    const owned = await sql<{ id: string }>`select id from matters where id = ${input.matterId} and user_id = ${userId}`;
    if (!owned[0]) throw new Error("Matter not found.");
  }
  const id = newId("im");
  const caseNumber = formatCaseNumber(input.lookup);
  const cnr = (input.lookup.cnr ?? "").trim();
  importLog("started", { jobId: id, court: input.courtId, caseNumber, cnr: cnr || undefined, matterId: input.matterId ?? null });
  await sql`
    insert into case_imports (
      id, user_id, matter_id, court_id, case_number, cnr, lookup_json, status, stage_note, summary_json, official_url
    ) values (
      ${id}, ${userId}, ${input.matterId ?? null}, ${input.courtId}, ${caseNumber}, ${cnr},
      ${JSON.stringify(input.lookup)}, ${"CREATED"}, ${"Import created."}, ${JSON.stringify(emptySummary())},
      ${""}
    )
  `;
  return id;
}
