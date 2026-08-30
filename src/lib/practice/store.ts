// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { PROCEEDINGS } from "./types";
import { defaultStage, proceedingDef } from "./workflow";
import { addDaysISO, newId, parseParties, todayISO } from "./ids";
import { isSampleMatter } from "./sample";
import type { Deadline, Hearing, Matter, MatterDocument, MatterOrder, Task, TimelineEvent } from "./types";

export const proceedingZ = z.enum(PROCEEDINGS);
export function parseJson(raw, fallback) {
	try {
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}
export function mapMatter(row) {
	return {
		id: row.id,
		clientId: row.client_id,
		clientName: row.client_name ?? "",
		title: row.title,
		proceeding: row.proceeding,
		stage: row.stage,
		courtName: row.court_name,
		caseNumber: row.case_number,
		cnr: row.cnr,
		caseType: row.case_type,
		jurisdiction: row.jurisdiction,
		ourSide: row.our_side,
		parties: parseJson(row.parties_json, []),
		status: row.status,
		nextHearingOn: row.next_hearing_on,
		lastOrderOn: row.last_order_on,
		notes: row.notes,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}
async function touchMatter(sql, userId, matterId, patch) {
	if (patch.nextHearingOn !== undefined) await sql`update matters set next_hearing_on = ${patch.nextHearingOn}, updated_at = now() where id = ${matterId} and user_id = ${userId}`;
	if (patch.lastOrderOn !== undefined) await sql`update matters set last_order_on = ${patch.lastOrderOn}, updated_at = now() where id = ${matterId} and user_id = ${userId}`;
	if (patch.stage) await sql`update matters set stage = ${patch.stage}, updated_at = now() where id = ${matterId} and user_id = ${userId}`;
}
async function addEvent(sql, userId, matterId, kind, title, detail, origin, refId = null, happenedOn = todayISO()) {
	await sql`
    insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id)
    values (${newId("ev")}, ${userId}, ${matterId}, ${happenedOn}, ${kind}, ${title}, ${detail}, ${origin}, ${refId})
  `;
}
export const listMatters = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	return (await (await getSql())`
      select m.*, coalesce(c.name, '') as client_name
      from matters m
      left join clients c on c.id = m.client_id
      where m.user_id = ${context.userId}
      order by coalesce(m.next_hearing_on, '9999-12-31') asc, m.updated_at desc
    `).map(mapMatter);
});
export async function loadMatterBundle(userId, id) {
	const sql = await getSql();
	const matters = await sql`
      select m.*, coalesce(c.name, '') as client_name
      from matters m
      left join clients c on c.id = m.client_id
      where m.id = ${id} and m.user_id = ${userId}
    `;
	if (!matters[0]) return null;
	const matter = mapMatter(matters[0]);
	const hearings = await sql`
      select h.*, m.title as matter_title, m.court_name
      from hearings h join matters m on m.id = h.matter_id
      where h.matter_id = ${id} and h.user_id = ${userId}
      order by h.listed_on desc
    `;
	const documents = await sql`
      select * from matter_documents where matter_id = ${id} and user_id = ${userId} order by created_at desc
    `;
	const orders = await sql`
      select * from matter_orders where matter_id = ${id} and user_id = ${userId} order by created_at desc
    `;
	const tasks = await sql`
      select t.*, coalesce(m.title, '') as matter_title
      from tasks t left join matters m on m.id = t.matter_id
      where t.matter_id = ${id} and t.user_id = ${userId}
      order by t.status asc, coalesce(t.due_on, '9999-12-31') asc
    `;
	const deadlines = await sql`
      select d.*, coalesce(m.title, '') as matter_title
      from deadlines d left join matters m on m.id = d.matter_id
      where d.matter_id = ${id} and d.user_id = ${userId}
      order by d.due_on asc
    `;
	const timeline = await sql`
      select * from timeline_events where matter_id = ${id} and user_id = ${userId}
      order by happened_on desc, created_at desc
      limit 80
    `;
	return {
		matter,
		hearings: hearings.map(mapHearing),
		documents: documents.map(mapDoc),
		orders: orders.map(mapOrder),
		tasks: tasks.map(mapTask),
		deadlines: deadlines.map(mapDeadline),
		timeline: timeline.map(mapEvent)
	};
}
export const getMatterBundle = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((id) => z.string().min(1).parse(id)).handler(async ({ context, data: id }) => {
	return loadMatterBundle(context.userId, id);
});
export function mapHearing(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		matterTitle: row.matter_title,
		courtName: row.court_name,
		listedOn: row.listed_on,
		listedAt: row.listed_at,
		courtRoom: row.court_room,
		bench: row.bench,
		purpose: row.purpose,
		stage: row.stage,
		outcome: row.outcome,
		nextDate: row.next_date,
		notes: row.notes,
		createdAt: row.created_at
	};
}
export function mapDoc(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		kind: row.kind,
		title: row.title,
		text: row.body,
		sourceKind: row.source_kind,
		createdAt: row.created_at
	};
}
export function mapOrder(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		documentId: row.document_id,
		orderDate: row.order_date,
		body: row.body,
		directions: parseJson(row.directions_json, []),
		confirmed: Boolean(row.confirmed),
		createdAt: row.created_at
	};
}
export function mapTask(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		matterTitle: row.matter_title,
		title: row.title,
		origin: row.origin,
		status: row.status,
		dueOn: row.due_on,
		sourceQuote: row.source_quote,
		createdAt: row.created_at
	};
}
export function mapDeadline(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		matterTitle: row.matter_title,
		title: row.title,
		dueOn: row.due_on,
		origin: row.origin,
		sourceQuote: row.source_quote,
		status: row.status,
		createdAt: row.created_at
	};
}
export function mapEvent(row) {
	return {
		id: row.id,
		matterId: row.matter_id,
		happenedOn: row.happened_on,
		kind: row.kind,
		title: row.title,
		detail: row.detail,
		origin: row.origin,
		refId: row.ref_id,
		createdAt: row.created_at
	};
}
export const getTodayBoard = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	await deleteOrphanPractice(sql, context.userId);
	const today = todayISO();
	const hearingsToday = await sql`
      select h.*, m.title as matter_title, m.court_name
      from hearings h join matters m on m.id = h.matter_id
      where h.user_id = ${context.userId} and h.listed_on = ${today}
      order by h.listed_at asc, m.title asc
    `;
	const hearingsUpcoming = await sql`
      select h.*, m.title as matter_title, m.court_name
      from hearings h join matters m on m.id = h.matter_id
      where h.user_id = ${context.userId} and h.listed_on > ${today}
      order by h.listed_on asc, h.listed_at asc
      limit 12
    `;
	const deadlines = await sql`
      select d.*, coalesce(m.title, '') as matter_title
      from deadlines d join matters m on m.id = d.matter_id
      where d.user_id = ${context.userId} and d.status = 'open'
      order by d.due_on asc
      limit 20
    `;
	const openTasks = await sql`
      select t.*, coalesce(m.title, '') as matter_title
      from tasks t join matters m on m.id = t.matter_id
      where t.user_id = ${context.userId} and t.status = 'open'
      order by coalesce(t.due_on, '9999-12-31') asc
      limit 20
    `;
	const unconfirmedOrders = await sql`
      select o.*, m.title as matter_title
      from matter_orders o join matters m on m.id = o.matter_id
      where o.user_id = ${context.userId} and o.confirmed = false
      order by o.created_at desc
      limit 10
    `;
	const staleMatters = await sql`
      select m.*, coalesce(c.name, '') as client_name
      from matters m
      left join clients c on c.id = m.client_id
      where m.user_id = ${context.userId}
        and m.status = 'active'
        and (m.next_hearing_on is null or m.next_hearing_on < ${today})
      order by m.updated_at desc
      limit 10
    `;
	const sampleRow = (await sql`
      select id, title, case_number from matters
      where user_id = ${context.userId}
    `).filter((r) => isSampleMatter({ title: r.title, caseNumber: r.case_number }));
	return {
		hearingsToday: hearingsToday.map(mapHearing),
		hearingsUpcoming: hearingsUpcoming.map(mapHearing),
		deadlines: deadlines.map(mapDeadline),
		openTasks: openTasks.map(mapTask),
		unconfirmedOrders: unconfirmedOrders.map(mapOrder),
		staleMatters: staleMatters.map(mapMatter),
		sampleLoaded: sampleRow.length > 0,
		counts: {
			hearingsToday: hearingsToday.length,
			deadlines: deadlines.length,
			openTasks: openTasks.length,
			unconfirmedOrders: unconfirmedOrders.length,
			staleMatters: staleMatters.length
		}
	};
});
export const listHearingsRange = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const from = addDaysISO(todayISO(), -14);
	return (await sql`
      select h.*, m.title as matter_title, m.court_name
      from hearings h join matters m on m.id = h.matter_id
      where h.user_id = ${context.userId} and h.listed_on >= ${from}
      order by h.listed_on asc, h.listed_at asc
    `).map(mapHearing);
});
export const draftSchema = z.object({
	title: z.string().trim().min(2).max(240),
	clientName: z.string().trim().max(180),
	proceeding: proceedingZ,
	stage: z.string().min(1).max(60),
	courtName: z.string().trim().max(180),
	caseNumber: z.string().trim().max(80),
	cnr: z.string().trim().max(80),
	caseType: z.string().trim().max(80),
	jurisdiction: z.string().trim().max(80),
	ourSide: z.string().min(1).max(40),
	partiesText: z.string().max(2000),
	notes: z.string().max(4000)
});
export const saveMatter = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => ({
	...draftSchema.parse(input),
	id: input.id
})).handler(async ({ context, data }) => {
	const sql = await getSql();
	const id = data.id ?? newId("mt");
	let clientId = null;
	if (data.clientName.trim()) {
		clientId = newId("cl");
		await sql`
        insert into clients (id, user_id, name) values (${clientId}, ${context.userId}, ${data.clientName.trim()})
      `;
	}
	const parties = parseParties(data.partiesText);
	const stage = data.stage || defaultStage(data.proceeding);
	if ((data.id ? await sql`select id from matters where id = ${data.id} and user_id = ${context.userId}` : [])[0]) await sql`
        update matters set
          title = ${data.title},
          proceeding = ${data.proceeding},
          stage = ${stage},
          court_name = ${data.courtName},
          case_number = ${data.caseNumber},
          cnr = ${data.cnr},
          case_type = ${data.caseType},
          jurisdiction = ${data.jurisdiction},
          our_side = ${data.ourSide},
          parties_json = ${JSON.stringify(parties)},
          notes = ${data.notes},
          updated_at = now()
        where id = ${data.id} and user_id = ${context.userId}
      `;
	else {
		await sql`
        insert into matters (
          id, user_id, client_id, title, proceeding, stage, court_name, case_number, cnr,
          case_type, jurisdiction, our_side, parties_json, notes
        ) values (
          ${id}, ${context.userId}, ${clientId}, ${data.title}, ${data.proceeding}, ${stage},
          ${data.courtName}, ${data.caseNumber}, ${data.cnr}, ${data.caseType}, ${data.jurisdiction},
          ${data.ourSide}, ${JSON.stringify(parties)}, ${data.notes}
        )
      `;
		await addEvent(sql, context.userId, id, "stage", "Matter opened", `${data.proceeding} · ${stage}`, "lawyer");
	}
	return { id };
});
export const setMatterStage = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	matterId: z.string().min(1),
	stage: z.string().min(1).max(60)
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const rows = await sql`
      select proceeding, stage, title from matters where id = ${data.matterId} and user_id = ${context.userId}
    `;
	if (!rows[0]) return { ok: false };
	await touchMatter(sql, context.userId, data.matterId, { stage: data.stage });
	const label = proceedingDef(rows[0].proceeding).stages.find((s) => s.id === data.stage)?.label ?? data.stage;
	await addEvent(sql, context.userId, data.matterId, "stage", `Stage → ${label}`, rows[0].stage, "lawyer");
	return { ok: true };
});
export const addHearing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	matterId: z.string().min(1),
	listedOn: z.string().min(8).max(12),
	listedAt: z.string().max(40).optional(),
	purpose: z.string().max(240).optional(),
	courtRoom: z.string().max(80).optional(),
	bench: z.string().max(80).optional()
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	if (!(await sql`select id from matters where id = ${data.matterId} and user_id = ${context.userId}`)[0]) return { ok: false };
	const id = newId("hr");
	await sql`
      insert into hearings (id, user_id, matter_id, listed_on, listed_at, purpose, court_room, bench, stage)
      values (${id}, ${context.userId}, ${data.matterId}, ${data.listedOn}, ${data.listedAt ?? ""}, ${data.purpose ?? ""}, ${data.courtRoom ?? ""}, ${data.bench ?? ""}, ${data.purpose ?? ""})
    `;
	await touchMatter(sql, context.userId, data.matterId, { nextHearingOn: data.listedOn });
	await addEvent(sql, context.userId, data.matterId, "hearing", `Listed ${data.listedOn}`, data.purpose ?? "", "lawyer", id, data.listedOn);
	return {
		ok: true,
		id
	};
});
export const recordHearing = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	hearingId: z.string().min(1),
	outcome: z.string().max(2000),
	courtSaid: z.string().max(4000),
	nextDate: z.string().max(12).optional()
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const rows = await sql`
      select id, matter_id from hearings where id = ${data.hearingId} and user_id = ${context.userId}
    `;
	if (!rows[0]) return { ok: false };
	const next = data.nextDate?.trim() || null;
	await sql`
      update hearings set outcome = ${data.outcome}, notes = ${data.courtSaid}, next_date = ${next}
      where id = ${data.hearingId} and user_id = ${context.userId}
    `;
	if (next) {
		await sql`
        insert into hearings (id, user_id, matter_id, listed_on, purpose, stage)
        values (${newId("hr")}, ${context.userId}, ${rows[0].matter_id}, ${next}, ${"As directed"}, ${"As directed"})
      `;
		await touchMatter(sql, context.userId, rows[0].matter_id, { nextHearingOn: next });
	}
	await addEvent(sql, context.userId, rows[0].matter_id, "hearing", "Hearing recorded", [data.outcome, data.courtSaid].filter(Boolean).join(" — "), "lawyer", data.hearingId);
	if (data.courtSaid.trim()) await sql`
        insert into tasks (id, user_id, matter_id, title, origin, source_quote)
        values (${newId("tk")}, ${context.userId}, ${rows[0].matter_id}, ${"Review what the court said and set follow-ups"}, ${"ai_suggestion"}, ${data.courtSaid.slice(0, 500)})
      `;
	return { ok: true };
});
export const addTask = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	matterId: z.string().min(1),
	title: z.string().trim().min(2).max(240),
	dueOn: z.string().max(12).optional(),
	origin: z.string().optional()
}).parse(input)).handler(async ({ context, data }) => {
	await (await getSql())`
      insert into tasks (id, user_id, matter_id, title, origin, due_on)
      values (${newId("tk")}, ${context.userId}, ${data.matterId}, ${data.title}, ${data.origin ?? "lawyer"}, ${data.dueOn || null})
    `;
	return { ok: true };
});
export const setTaskStatus = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	id: z.string().min(1),
	status: z.enum([
		"open",
		"done",
		"dismissed"
	])
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	await sql`update tasks set status = ${data.status} where id = ${data.id} and user_id = ${context.userId}`;
	await sql`update deadlines set status = ${data.status} where id = ${data.id} and user_id = ${context.userId}`;
	return { ok: true };
});
export const savePastedDocument = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	matterId: z.string().min(1),
	title: z.string().trim().min(1).max(240),
	body: z.string().trim().min(20).max(40000),
	kind: z.string().optional()
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const id = newId("dc");
	await sql`
      insert into matter_documents (id, user_id, matter_id, kind, title, body, source_kind)
      values (${id}, ${context.userId}, ${data.matterId}, ${data.kind ?? "order"}, ${data.title}, ${data.body}, ${"paste"})
    `;
	await addEvent(sql, context.userId, data.matterId, "document", data.title, "", "lawyer", id);
	return { id };
});
export async function saveAiDraftDocument(userId, matterId, title, kind, body) {
	const sql = await getSql();
	const id = newId("dc");
	await sql`
      insert into matter_documents (id, user_id, matter_id, kind, title, body, source_kind)
      values (${id}, ${userId}, ${matterId}, ${kind}, ${title}, ${body}, ${"ai_draft"})
    `;
	await addEvent(
		sql,
		userId,
		matterId,
		"document",
		title,
		"Drafted from a task or deadline. Review before filing.",
		"ai_suggestion",
		id,
	);
	return id;
}
export const saveUnconfirmedOrder = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	matterId: z.string().min(1),
	body: z.string().min(1).max(40000),
	directions: z.array(z.object({
		text: z.string(),
		party: z.string(),
		deadline: z.string().nullable(),
		quote: z.string()
	})),
	documentId: z.string().optional()
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const id = newId("or");
	await sql`
      insert into matter_orders (id, user_id, matter_id, document_id, body, directions_json, confirmed)
      values (${id}, ${context.userId}, ${data.matterId}, ${data.documentId ?? null}, ${data.body}, ${JSON.stringify(data.directions)}, false)
    `;
	return { id };
});
export const confirmOrder = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => z.object({
	orderId: z.string().min(1),
	applyStage: z.string().max(60).nullable().optional(),
	includeSuggestions: z.boolean().optional()
}).parse(input)).handler(async ({ context, data }) => {
	const sql = await getSql();
	const rows = await sql`
      select * from matter_orders where id = ${data.orderId} and user_id = ${context.userId}
    `;
	if (!rows[0]) return { ok: false };
	const order = mapOrder(rows[0]);
	await sql`update matter_orders set confirmed = true where id = ${data.orderId} and user_id = ${context.userId}`;
	await touchMatter(sql, context.userId, order.matterId, { lastOrderOn: todayISO() });
	for (const dir of order.directions) {
		await sql`
        insert into tasks (id, user_id, matter_id, title, origin, due_on, source_quote)
        values (${newId("tk")}, ${context.userId}, ${order.matterId}, ${dir.text.slice(0, 240)}, ${"court_direction"}, ${dir.deadline}, ${dir.quote.slice(0, 500)})
      `;
		if (dir.deadline) await sql`
          insert into deadlines (id, user_id, matter_id, title, due_on, origin, source_quote)
          values (${newId("dl")}, ${context.userId}, ${order.matterId}, ${dir.text.slice(0, 240)}, ${dir.deadline}, ${"court_direction"}, ${dir.quote.slice(0, 500)})
        `;
	}
	if (data.applyStage) await touchMatter(sql, context.userId, order.matterId, { stage: data.applyStage });
	await addEvent(sql, context.userId, order.matterId, "order", "Order confirmed", order.directions.map((d) => d.text).join("; "), "court_direction", order.id);
	return { ok: true };
});
export const discardOrder = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((id) => z.string().min(1).parse(id)).handler(async ({ context, data: id }) => {
	await (await getSql())`delete from matter_orders where id = ${id} and user_id = ${context.userId} and confirmed = false`;
	return { ok: true };
});
export const listUnconfirmedOrders = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
	return (await (await getSql())`
      select o.*, m.title as matter_title
      from matter_orders o join matters m on m.id = o.matter_id
      where o.user_id = ${context.userId} and o.confirmed = false
      order by o.created_at desc
    `).map((r) => ({
		...mapOrder(r),
		matterTitle: r.matter_title
	}));
});
async function findSampleMatters(sql, userId) {
	const rows = await sql`select id, client_id, title, case_number from matters where user_id = ${userId}`;
	return rows.filter((r) => isSampleMatter({ title: r.title, caseNumber: r.case_number }));
}

async function countRealMatters(sql, userId) {
	const rows = await sql`select title, case_number from matters where user_id = ${userId}`;
	return rows.filter((r) => !isSampleMatter({ title: r.title, caseNumber: r.case_number })).length;
}

async function deleteOrphanPractice(sql, userId) {
	await sql`delete from deadlines where user_id = ${userId} and not exists (select 1 from matters m where m.id = deadlines.matter_id)`;
	await sql`delete from tasks where user_id = ${userId} and not exists (select 1 from matters m where m.id = tasks.matter_id)`;
	await sql`delete from hearings where user_id = ${userId} and not exists (select 1 from matters m where m.id = hearings.matter_id)`;
	await sql`delete from timeline_events where user_id = ${userId} and not exists (select 1 from matters m where m.id = timeline_events.matter_id)`;
	await sql`delete from matter_orders where user_id = ${userId} and not exists (select 1 from matters m where m.id = matter_orders.matter_id)`;
	await sql`delete from matter_documents where user_id = ${userId} and not exists (select 1 from matters m where m.id = matter_documents.matter_id)`;
	await sql`delete from clients where user_id = ${userId} and not exists (select 1 from matters m where m.client_id = clients.id)`;
}

async function wipeUserPractice(sql, userId) {
	await sql`delete from timeline_events where user_id = ${userId}`;
	await sql`delete from matter_orders where user_id = ${userId}`;
	await sql`delete from matter_documents where user_id = ${userId}`;
	await sql`delete from hearings where user_id = ${userId}`;
	await sql`delete from tasks where user_id = ${userId}`;
	await sql`delete from deadlines where user_id = ${userId}`;
	await sql`update memos set matter_id = null where user_id = ${userId}`;
	await sql`delete from matters where user_id = ${userId}`;
	await sql`delete from clients where user_id = ${userId}`;
}

async function purgeSampleMatters(sql, userId) {
	if ((await countRealMatters(sql, userId)) === 0) {
		await wipeUserPractice(sql, userId);
		return 0;
	}
	const rows = await findSampleMatters(sql, userId);
	for (const row of rows) {
		await sql`delete from timeline_events where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`delete from matter_orders where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`delete from matter_documents where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`delete from hearings where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`delete from tasks where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`delete from deadlines where matter_id = ${row.id} and user_id = ${userId}`;
		await sql`update memos set matter_id = null where user_id = ${userId} and matter_id = ${row.id}`;
		await sql`delete from matters where id = ${row.id} and user_id = ${userId}`;
	}
	await deleteOrphanPractice(sql, userId);
	return rows.length;
}

export const seedSampleChamber = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const existing = await findSampleMatters(sql, context.userId);
	const real = await countRealMatters(sql, context.userId);
	if (existing.length === 0 && real > 0) return {
		ok: true,
		seeded: false
	};
	await purgeSampleMatters(sql, context.userId);
	const { buildSampleChamber } = await import("./sample");
	const pack = buildSampleChamber();
	for (const client of pack.clients) await sql`insert into clients (id, user_id, name, notes) values (${client.id}, ${context.userId}, ${client.name}, ${client.notes})`;
	for (const m of pack.matters) await sql`
        insert into matters (
          id, user_id, client_id, title, proceeding, stage, court_name, case_number, cnr,
          case_type, jurisdiction, our_side, parties_json, status, next_hearing_on, last_order_on, notes
        ) values (
          ${m.id}, ${context.userId}, ${m.clientId}, ${m.title}, ${m.proceeding}, ${m.stage}, ${m.courtName},
          ${m.caseNumber}, ${m.cnr}, ${m.caseType}, ${m.jurisdiction}, ${m.ourSide}, ${JSON.stringify(m.parties)},
          ${m.status}, ${m.nextHearingOn}, ${m.lastOrderOn}, ${m.notes}
        )
      `;
	for (const h of pack.hearings) await sql`
        insert into hearings (id, user_id, matter_id, listed_on, listed_at, court_room, bench, purpose, stage, outcome, notes, next_date)
        values (${h.id}, ${context.userId}, ${h.matterId}, ${h.listedOn}, ${h.listedAt ?? ""}, ${h.courtRoom ?? ""}, ${h.bench ?? ""}, ${h.purpose ?? ""}, ${h.stage ?? ""}, ${h.outcome ?? ""}, ${h.notes ?? ""}, ${h.nextDate ?? null})
      `;
	for (const t of pack.tasks) await sql`
        insert into tasks (id, user_id, matter_id, title, origin, due_on, source_quote)
        values (${t.id}, ${context.userId}, ${t.matterId}, ${t.title}, ${t.origin}, ${t.dueOn}, ${t.sourceQuote})
      `;
	for (const d of pack.deadlines) await sql`
        insert into deadlines (id, user_id, matter_id, title, due_on, origin, source_quote)
        values (${d.id}, ${context.userId}, ${d.matterId}, ${d.title}, ${d.dueOn}, ${d.origin}, ${d.sourceQuote})
      `;
	for (const e of pack.events) await sql`
        insert into timeline_events (id, user_id, matter_id, happened_on, kind, title, detail, origin, ref_id)
        values (${e.id}, ${context.userId}, ${e.matterId}, ${e.happenedOn}, ${e.kind}, ${e.title}, ${e.detail}, ${e.origin}, ${e.refId ?? null})
      `;
	for (const doc of pack.documents ?? []) await sql`
        insert into matter_documents (id, user_id, matter_id, kind, title, body, source_kind)
        values (${doc.id}, ${context.userId}, ${doc.matterId}, ${doc.kind}, ${doc.title}, ${doc.body}, ${doc.sourceKind ?? "paste"})
      `;
	for (const o of pack.orders ?? []) await sql`
        insert into matter_orders (id, user_id, matter_id, document_id, order_date, body, directions_json, confirmed)
        values (${o.id}, ${context.userId}, ${o.matterId}, ${o.documentId ?? null}, ${o.orderDate}, ${o.body}, ${JSON.stringify(o.directions ?? [])}, ${o.confirmed})
      `;
	return {
		ok: true,
		seeded: true,
		replaced: existing.length > 0
	};
});

export const clearSampleChamber = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
	const sql = await getSql();
	const removed = await purgeSampleMatters(sql, context.userId);
	return { ok: true, removed };
});
