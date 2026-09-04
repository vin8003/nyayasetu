/**
 * Server-only Partner API fetch + unconfirmed Inbox land.
 * Imported only from createServerFn handlers (dynamic import) so ECI_API_KEY
 * never ships to the browser.
 *
 * CiteBench uses this under the Partner API terms to assist a lawyer with
 * their own matters. Do not use this module for stand-alone competing
 * court-data resale without a written MSA / consent from eCourtsIndia.
 */
import { getSql } from "@/lib/db";
import { newId } from "@/lib/practice/ids";
import { insertPastedDocument, insertUnconfirmedOrder } from "@/lib/practice/store";
import { runExtractOrder } from "@/lib/practice/extract-order";
import { orderHash } from "@/lib/court-import/dedupe";
import { defaultStage } from "@/lib/practice/workflow";
import { fetchPartnerCase } from "./client";
import { hydrateOrderMarkdown } from "./hydrate";
import { isValidCnr, normalizeCnr, partnerCnrError } from "./cnr";
import { resolveEciApiKey } from "./key";
import { planInboxLand } from "./land";
import { hasLandableBody, parsePartnerCase, pendingOrderPdfs } from "./parse";
import { shouldSkipSample } from "./skip";
import { emptyParseResult, fetchErrorResult, missingKeyResult } from "./fail";
import { ECI_SOURCE_KIND, type FetchCnrResult } from "./types";

export function partnerConfigured(): { configured: boolean } {
  return { configured: Boolean(resolveEciApiKey()) };
}

type MatterRow = {
  id: string;
  title: string;
  proceeding: string;
  stage: string;
  case_number: string;
  cnr: string;
  court_name: string;
  notes: string;
};

async function loadExisting(sql: Awaited<ReturnType<typeof getSql>>, userId: string, matterId: string) {
  const docs = await sql<{ external_id: string; content_hash: string; title: string }>`
    select external_id, content_hash, title from matter_documents
    where matter_id = ${matterId} and user_id = ${userId}
  `;
  return docs.map((d) => ({
    externalId: d.external_id,
    contentHash: d.content_hash,
    title: d.title,
  }));
}

async function hasPartnerDocs(sql: Awaited<ReturnType<typeof getSql>>, userId: string, matterId: string) {
  const rows = await sql<{ id: string }>`
    select id from matter_documents
    where matter_id = ${matterId} and user_id = ${userId} and source_kind = ${ECI_SOURCE_KIND}
    limit 1
  `;
  return Boolean(rows[0]);
}

async function ensureMatter(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  matterId: string | undefined,
  cnr: string,
  preview: { title: string; courtName: string; caseNumber: string; nextHearingOn: string | null },
): Promise<{ ok: true; matter: MatterRow } | { ok: false; error: "SAMPLE_SKIPPED" | "NOT_FOUND"; message: string }> {
  if (matterId) {
    const rows = await sql<MatterRow>`
      select id, title, proceeding, stage, case_number, cnr, court_name, notes
      from matters where id = ${matterId} and user_id = ${userId}
    `;
    const row = rows[0];
    if (!row) return { ok: false, error: "NOT_FOUND", message: "Matter not found." };
    if (shouldSkipSample({ title: row.title, caseNumber: row.case_number })) {
      return { ok: false, error: "SAMPLE_SKIPPED", message: "Sample chamber matters are not fetched from eCourtsIndia." };
    }
    const nextCnr = String(row.cnr || "").trim() ? row.cnr : cnr;
    const nextCase = String(row.case_number || "").trim() ? row.case_number : preview.caseNumber;
    const nextCourt = String(row.court_name || "").trim() ? row.court_name : preview.courtName;
    await sql`
      update matters set
        cnr = ${nextCnr},
        case_number = ${nextCase},
        court_name = ${nextCourt},
        last_synced_at = now(),
        court_source_id = ${"eci-partner"},
        updated_at = now()
      where id = ${matterId} and user_id = ${userId}
    `;
    return { ok: true, matter: { ...row, cnr: nextCnr, case_number: nextCase, court_name: nextCourt } };
  }

  const id = newId("mt");
  const title = (preview.title || cnr).slice(0, 240);
  const proceeding = "civil";
  const stage = defaultStage(proceeding);
  await sql`
    insert into matters (
      id, user_id, title, proceeding, stage, court_name, case_number, cnr,
      case_type, jurisdiction, our_side, parties_json, notes, next_hearing_on,
      court_source_id, last_synced_at, import_status
    ) values (
      ${id}, ${userId}, ${title}, ${proceeding}, ${stage}, ${preview.courtName}, ${preview.caseNumber}, ${cnr},
      ${""}, ${""}, ${"petitioner"}, ${"[]"}, ${""}, ${null},
      ${"eci-partner"}, now(), ${"inbox"}
    )
  `;
  return {
    ok: true,
    matter: {
      id,
      title,
      proceeding,
      stage,
      case_number: preview.caseNumber,
      cnr,
      court_name: preview.courtName,
      notes: "",
    },
  };
}

export async function fetchCnrToInboxImpl(
  userId: string,
  data: { matterId?: string; cnr?: string; refresh?: boolean },
): Promise<FetchCnrResult> {
  const sql = await getSql();
  const apiKey = resolveEciApiKey();
  if (!apiKey) {
    return missingKeyResult();
  }

  let typed = data.cnr ?? "";
  if (data.matterId) {
    const rows = await sql<{ cnr: string; title: string; case_number: string }>`
      select cnr, title, case_number from matters
      where id = ${data.matterId} and user_id = ${userId}
    `;
    if (!rows[0]) return { ok: false, error: "HTTP", status: "fetch_error", message: "Matter not found." };
    if (shouldSkipSample({ title: rows[0].title, caseNumber: rows[0].case_number, cnr: typed || rows[0].cnr })) {
      return {
        ok: false,
        error: "SAMPLE_SKIPPED",
        status: "fetch_error",
        message: "Sample chamber matters are not fetched from eCourtsIndia.",
      };
    }
    if (!typed.trim()) typed = rows[0].cnr;
  }

  const cnrErr = partnerCnrError(typed);
  if (cnrErr === "BLANK_CNR") {
    return { ok: false, error: "BLANK_CNR", status: "fetch_error", message: "Enter a CNR." };
  }
  if (cnrErr === "INVALID_CNR" || !isValidCnr(typed)) {
    return { ok: false, error: "INVALID_CNR", status: "fetch_error", message: "CNR must be 16 letters and digits.", cnr: typed };
  }
  const cnr = normalizeCnr(typed);
  if (shouldSkipSample({ cnr })) {
    return {
      ok: false,
      error: "SAMPLE_SKIPPED",
      status: "fetch_error",
      message: "Sample chamber matters are not fetched from eCourtsIndia.",
      cnr,
    };
  }

  let refresh = Boolean(data.refresh);
  if (!refresh && data.matterId) {
    refresh = await hasPartnerDocs(sql, userId, data.matterId);
  }

  const fetched = await fetchPartnerCase({ cnr, apiKey, refresh });
  if (!fetched.ok) {
    return fetchErrorResult(fetched, cnr);
  }

  const parsed = parsePartnerCase(fetched.json);
  if (!hasLandableBody(parsed.orders) && pendingOrderPdfs(parsed.orders).length) {
    await hydrateOrderMarkdown({ cnr, apiKey, orders: parsed.orders });
  }
  const preview = {
    ...parsed.preview,
    cnr: parsed.preview.cnr || cnr,
  };
  const planProbe = planInboxLand(parsed.orders, []);
  if (planProbe.empty) {
    return emptyParseResult(cnr, pendingOrderPdfs(parsed.orders).length > 0);
  }

  const ensured = await ensureMatter(sql, userId, data.matterId, cnr, preview);
  if (!ensured.ok) {
    return {
      ok: false,
      error: ensured.error === "SAMPLE_SKIPPED" ? "SAMPLE_SKIPPED" : "HTTP",
      status: "fetch_error",
      message: ensured.message,
      cnr,
    };
  }
  const matter = ensured.matter;

  const existing = await loadExisting(sql, userId, matter.id);
  const plan = planInboxLand(parsed.orders, existing);
  if (plan.empty) {
    return emptyParseResult(cnr, pendingOrderPdfs(parsed.orders).length > 0);
  }

  let aiAvailable = true;
  let needsHuman = 0;
  const pending: Array<{
    id: string;
    documentId: string;
    title: string;
    orderDate: string | null;
    body: string;
    directions: Array<{ text: string; party: string; deadline: string | null; quote: string }>;
  }> = [];

  for (const order of plan.toLand) {
    // extractOrder → savePastedDocument → saveUnconfirmedOrder.
    // NEVER confirmOrder: directions stay on the unconfirmed row until Inbox Confirm.
    let directions: Array<{ text: string; party: string; deadline: string | null; quote: string }> = [];
    if (aiAvailable && order.body.trim().length >= 40) {
      const extracted = await runExtractOrder(userId, {
        matterTitle: matter.title,
        proceeding: matter.proceeding,
        stage: matter.stage,
        orderText: order.body.slice(0, 40000),
      });
      if (extracted?.ok) {
        directions = extracted.extract.directions ?? [];
      } else {
        needsHuman += 1;
        const err = String(extracted?.error ?? "");
        if (err === "AI_UNAVAILABLE" || err === "PAYWALL" || err === "TIMEOUT") aiAvailable = false;
      }
    } else {
      needsHuman += 1;
    }

    const doc = await insertPastedDocument(sql, userId, {
      matterId: matter.id,
      title: order.title.slice(0, 240) || "Court order",
      body: order.body.slice(0, 40000),
      kind: "order",
      sourceKind: ECI_SOURCE_KIND,
      sourceUrl: order.sourceUrl,
      externalId: order.externalId,
      contentHash: orderHash(order),
    });
    const saved = await insertUnconfirmedOrder(sql, userId, {
      matterId: matter.id,
      body: order.body.slice(0, 40000),
      directions,
      documentId: doc.id,
      orderDate: order.orderDate,
    });
    pending.push({
      id: saved.id,
      documentId: doc.id,
      title: order.title,
      orderDate: order.orderDate,
      body: order.body,
      directions,
    });
  }

  return {
    ok: true,
    matterId: matter.id,
    cnr,
    preview,
    landed: pending.length,
    duplicates: plan.duplicates.length,
    failed: plan.failed.length,
    needsHuman,
    refreshed: fetched.refreshed,
    pending,
  };
}
