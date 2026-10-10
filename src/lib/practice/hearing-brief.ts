// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample-ids";
import { loadMatterBundle } from "./store";
import { stageDef } from "./workflow";
import { extractResearchQuestion } from "./intake-from-matter";
import { INDIAN_LAW_CONTEXT, todayIst, todayLine } from "@/lib/ai/context";
import { pullJson as pullJsonShared } from "@/lib/ai/json";
import { DEFAULT_FAST_MODEL, fastModel } from "@/lib/ai/models";
import { sendWithFallback, withRepairTurn } from "@/lib/ai/retry";
import { chatJsonFormat, list, obj, str } from "@/lib/ai/schema";
import { XaiHttpError, chatText } from "@/lib/ai/xai-response";

const BRIEF_TIMEOUT_MS = 45_000;
const BRIEF_MIN_RETRY_MS = 15_000;

const BRIEF_JSON_SCHEMA = obj({
	purpose: str(),
	lastOrder: str(),
	lastHearing: str(),
	courtDirected: str(),
	ourPosition: str(),
	opponentPosition: str(),
	issues: list(str()),
	documentsToReview: list(str()),
	authorities: list(str()),
	openItems: list(str()),
	expectedNext: str(),
	caveats: list(str()),
});

export const BRIEF_SYSTEM = `Prepare a hearing brief for an Indian advocate from the case file, to read in the corridor before the matter is called. JSON only:
{
  "purpose": "what this listing is for and what the advocate must achieve today",
  "lastOrder": "what the court actually ordered last time, in two or three lines, or unknown",
  "lastHearing": "date, what happened, who sought what",
  "courtDirected": "court directions only, with the party and whether they appear complied with on the file",
  "ourPosition": "our case in three or four crisp sentences, from the notes",
  "opponentPosition": "their case as it appears from the file, or 'not on file'",
  "issues": ["the questions the bench is likely to take up at this stage"],
  "documentsToReview": ["papers on the file to have flagged, with why"],
  "authorities": ["only authorities named in the file (notes, papers, orders); never add new ones"],
  "openItems": ["pending compliance, deadlines and tasks, overdue first"],
  "expectedNext": "the likely outcome of this listing and the next step",
  "caveats": ["inferences and missing facts"]
}
Rules:
- Use only the file. Separate what the court directed from your suggestions.
- Do not invent citations, dates or facts. If something is not on the file, say "not on file".
- Tailor to the stage: say what the court usually does at this stage of this proceeding.
- Short, scannable lines. Not legal advice.

${INDIAN_LAW_CONTEXT}`;

export const briefSchema = z.object({
	purpose: z.string().catch(""),
	lastOrder: z.string().catch(""),
	lastHearing: z.string().catch(""),
	courtDirected: z.string().catch(""),
	ourPosition: z.string().catch(""),
	opponentPosition: z.string().catch(""),
	issues: z.array(z.string()).catch([]),
	documentsToReview: z.array(z.string()).catch([]),
	authorities: z.array(z.string()).catch([]),
	openItems: z.array(z.string()).catch([]),
	expectedNext: z.string().catch(""),
	caveats: z.array(z.string()).catch([]),
});

export function pullJson(text) {
	return pullJsonShared(text);
}

// Hearings arrive newest first (listed_on desc); pick by date, not by position.
export function upcomingHearing(bundle, today = todayIst()) {
	const future = bundle.hearings.filter((h) => (h.listedOn ?? "") >= today);
	if (future.length) return future.reduce((a, b) => ((b.listedOn ?? "") < (a.listedOn ?? "") ? b : a));
	return bundle.hearings[0] ?? null;
}

export function previousHearing(bundle, today = todayIst()) {
	const past = bundle.hearings.filter((h) => h.listedOn && h.listedOn < today);
	if (past.length) return past.reduce((a, b) => (b.listedOn > a.listedOn ? b : a));
	return null;
}

export function briefFromBundle(bundle) {
	const matter = bundle.matter;
	const stage = stageDef(matter.proceeding, matter.stage);
	const next = upcomingHearing(bundle);
	const lastHearing = previousHearing(bundle);
	const lastOrder = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
	const directions = (lastOrder?.directions ?? [])
		.map((d) => (typeof d === "string" ? d : d.text || d.quote || ""))
		.filter(Boolean);
	const openTasks = (bundle.tasks ?? []).filter((t) => t.status === "open");
	const openDeadlines = (bundle.deadlines ?? []).filter((d) => d.status !== "done" && d.status !== "dropped");
	const papers = (bundle.documents ?? []).map((d) => d.title).filter(Boolean);
	const question = extractResearchQuestion(matter.notes ?? "");
	const issues = (matter.notes ?? "")
		.split("\n")
		.map((line) => line.replace(/^\d+\.\s*/, "").trim())
		.filter((line) => line.length > 24 && line.length < 280)
		.slice(0, 5);
	const caveats = [
		"Built from the papers on this file. Check the last order before you rely on a date.",
		"Not legal advice.",
	];
	return briefSchema.parse({
		purpose: next?.purpose || stage?.label || matter.stage,
		lastOrder: (lastOrder?.body ?? "").trim().slice(0, 900) || "No order on the file.",
		lastHearing: lastHearing
			? [lastHearing.listedOn, lastHearing.listedAt, lastHearing.purpose, lastHearing.outcome].filter(Boolean).join(" · ")
			: "No hearing recorded.",
		courtDirected: directions.join(" ") || (lastOrder?.body ?? "").split("\n").slice(0, 3).join(" ").slice(0, 400),
		ourPosition: question || (matter.notes ?? "").split("\n").find((l) => l.trim().length > 40)?.trim()?.slice(0, 500) || "",
		opponentPosition: "",
		issues: issues.length ? issues : question ? [question] : [],
		documentsToReview: papers.slice(0, 8),
		authorities: [],
		openItems: [
			...openDeadlines.map((d) => `${d.dueOn}: ${d.title}`),
			...openTasks.map((t) => t.title),
		].slice(0, 8),
		expectedNext: next
			? `${next.listedOn}${next.listedAt ? ` ${next.listedAt}` : ""} — ${next.purpose || "listed"}`
			: stage?.what || "",
		caveats,
	});
}

function daysBetween(from, to) {
	const a = Date.parse(`${from}T00:00:00Z`);
	const b = Date.parse(`${to}T00:00:00Z`);
	if (Number.isNaN(a) || Number.isNaN(b)) return null;
	return Math.round((b - a) / 86_400_000);
}

export function briefPrompt(bundle, now = new Date()) {
	const stage = stageDef(bundle.matter.proceeding, bundle.matter.stage);
	const today = todayIst(now);
	const next = upcomingHearing(bundle, today);
	const lastHearing = previousHearing(bundle, today);
	const lastOrder = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
	const directions = (lastOrder?.directions ?? [])
		.map((d) => (typeof d === "string" ? d : [d.text || d.quote, d.party && `(${d.party})`, d.deadline && `by ${d.deadline}`].filter(Boolean).join(" ")))
		.filter(Boolean);
	const days = next?.listedOn ? daysBetween(today, next.listedOn) : null;
	return [
		todayLine(now),
		`Title: ${bundle.matter.title}`,
		`Court: ${bundle.matter.courtName} ${bundle.matter.caseNumber}`,
		`Proceeding: ${bundle.matter.proceeding} · stage ${bundle.matter.stage}${stage?.label ? ` (${stage.label})` : ""}`,
		`Stage meaning: ${stage?.what ?? ""}`,
		stage?.court ? `What the court does at this stage: ${stage.court}` : "",
		`Parties: ${(bundle.matter.parties ?? []).map((p) => `${p.role} ${p.name}`).join("; ")}`,
		`Our side: ${bundle.matter.ourSide}`,
		next
			? `Hearing being prepared: ${next.listedOn}${next.listedAt ? ` ${next.listedAt}` : ""} — ${next.purpose || "purpose not recorded"}${days !== null ? ` (${days === 0 ? "today" : days > 0 ? `in ${days} day(s)` : `${-days} day(s) ago`})` : ""}`
			: "Hearing being prepared: no date on file",
		`Notes:\n${(bundle.matter.notes ?? "").slice(0, 6000)}`,
		`Last hearing: ${lastHearing ? `${lastHearing.listedOn} ${lastHearing.purpose ?? ""} ${lastHearing.outcome ?? ""}` : "none"}`,
		`Last order${lastOrder?.confirmed ? "" : " (unconfirmed)"}:\n${(lastOrder?.body ?? "none").slice(0, 4000)}`,
		directions.length ? `Directions in that order:\n${directions.map((d) => `- ${d}`).join("\n")}` : "",
		`Open tasks: ${bundle.tasks.filter((t) => t.status === "open").map((t) => `${t.origin}: ${t.title}${t.dueOn ? ` (due ${t.dueOn})` : ""}`).join(" | ") || "none"}`,
		`Deadlines: ${bundle.deadlines.filter((d) => d.status === "open").map((d) => `${d.dueOn} ${d.origin}: ${d.title}`).join(" | ") || "none"}`,
		`Papers: ${(bundle.documents ?? []).map((d) => d.title).join(" | ") || "none"}`,
		`Timeline: ${bundle.timeline.slice(0, 20).map((e) => `${e.happenedOn} ${e.title}`).join(" | ") || "none"}`,
	].filter(Boolean).join("\n");
}

async function briefFromModel(bundle) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return null;
	const model = fastModel();
	const messages = [
		{ role: "system", content: BRIEF_SYSTEM },
		{ role: "user", content: briefPrompt(bundle) },
	];
	const deadline = Date.now() + BRIEF_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), BRIEF_TIMEOUT_MS);
	try {
		const send = async (body) => {
			const res = await fetch("https://api.x.ai/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				signal: controller.signal,
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new XaiHttpError(res.status, await res.text().catch(() => ""));
			return chatText(await res.json());
		};
		const { value } = await sendWithFallback({
			tag: "hearing-brief",
			send,
			build: ({ legacy, repair }) => ({
				model: legacy ? DEFAULT_FAST_MODEL : model,
				temperature: 0.2,
				max_tokens: 2500,
				response_format: legacy ? { type: "json_object" } : chatJsonFormat("hearing_brief", BRIEF_JSON_SCHEMA),
				messages: withRepairTurn(messages, repair),
			}),
			parse: (text) => briefSchema.parse(pullJson(text)),
			deadline,
			minRetryMs: BRIEF_MIN_RETRY_MS,
		});
		return value;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
}

export const prepareHearingBrief = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((matterId) => z.string().min(1).parse(matterId))
	.handler(async ({ data: matterId, context: auth }) => {
		const bundle = await loadMatterBundle(auth.userId, matterId);
		if (!bundle) return { ok: false, error: "NOT_FOUND" };
		const demo = looksLikeSample({ title: bundle.matter.title });
		const gated = await gateAi(auth.userId, { demo });
		if (!gated.ok) return gated;
		const ai = await briefFromModel(bundle);
		if (ai) return { ok: true, brief: ai };
		if (demo) return { ok: true, brief: briefFromBundle(bundle) };
		return { ok: false, error: "AI_UNAVAILABLE" };
	});
