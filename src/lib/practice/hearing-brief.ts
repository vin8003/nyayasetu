// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample";
import { loadMatterBundle } from "./store";
import { stageDef } from "./workflow";
import { extractResearchQuestion } from "./intake-from-matter";

const MODEL = "grok-4.20-0309-non-reasoning";
const BRIEF_TIMEOUT_MS = 45_000;

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
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("PARSE");
	return JSON.parse(text.slice(start, end + 1));
}

function upcomingHearing(bundle) {
	const today = new Date().toISOString().slice(0, 10);
	return (
		bundle.hearings.find((h) => (h.listedOn ?? "") >= today) ??
		bundle.hearings[0] ??
		null
	);
}

export function briefFromBundle(bundle) {
	const matter = bundle.matter;
	const stage = stageDef(matter.proceeding, matter.stage);
	const next = upcomingHearing(bundle);
	const lastHearing = bundle.hearings[0];
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

function briefPrompt(bundle) {
	const stage = stageDef(bundle.matter.proceeding, bundle.matter.stage);
	const lastHearing = bundle.hearings[0];
	const lastOrder = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
	return [
		`Title: ${bundle.matter.title}`,
		`Court: ${bundle.matter.courtName} ${bundle.matter.caseNumber}`,
		`Proceeding: ${bundle.matter.proceeding} · stage ${bundle.matter.stage}`,
		`Stage meaning: ${stage?.what ?? ""}`,
		`Parties: ${(bundle.matter.parties ?? []).map((p) => `${p.role} ${p.name}`).join("; ")}`,
		`Our side: ${bundle.matter.ourSide}`,
		`Notes:\n${(bundle.matter.notes ?? "").slice(0, 3500)}`,
		`Last hearing: ${lastHearing ? `${lastHearing.listedOn} ${lastHearing.purpose} ${lastHearing.outcome}` : "none"}`,
		`Last order:\n${(lastOrder?.body ?? "none").slice(0, 1800)}`,
		`Open tasks: ${bundle.tasks.filter((t) => t.status === "open").map((t) => `${t.origin}: ${t.title}`).join(" | ")}`,
		`Deadlines: ${bundle.deadlines.filter((d) => d.status === "open").map((d) => `${d.dueOn} ${d.origin}: ${d.title}`).join(" | ")}`,
		`Papers: ${(bundle.documents ?? []).map((d) => d.title).join(" | ")}`,
		`Timeline: ${bundle.timeline.slice(0, 12).map((e) => `${e.happenedOn} ${e.title}`).join(" | ")}`,
	].join("\n");
}

async function briefFromModel(bundle) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return null;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), BRIEF_TIMEOUT_MS);
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			signal: controller.signal,
			body: JSON.stringify({
				model: MODEL,
				temperature: 0.2,
				max_tokens: 1800,
				response_format: { type: "json_object" },
				messages: [
					{
						role: "system",
						content: `Prepare a hearing brief for an Indian advocate from the case file. JSON only:
{
  "purpose": "",
  "lastOrder": "what the court actually ordered, or unknown",
  "lastHearing": "",
  "courtDirected": "court directions only",
  "ourPosition": "",
  "opponentPosition": "",
  "issues": [],
  "documentsToReview": [],
  "authorities": [],
  "openItems": [],
  "expectedNext": "",
  "caveats": ["inferences and missing facts"]
}
Separate court directions from suggestions. Do not invent citations. Not legal advice.`,
					},
					{ role: "user", content: briefPrompt(bundle) },
				],
			}),
		});
		if (!res.ok) return null;
		const payload = await res.json();
		const text = payload.choices?.[0]?.message?.content ?? "";
		return briefSchema.parse(pullJson(text));
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
