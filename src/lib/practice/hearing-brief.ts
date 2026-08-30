// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample";
import { getMatterBundle } from "./store";
import { stageDef } from "./workflow";

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
	caveats: z.array(z.string()).catch([])
});
export function pullJson(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("PARSE");
	return JSON.parse(text.slice(start, end + 1));
}
export const prepareHearingBrief = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((matterId) => z.string().min(1).parse(matterId)).handler(async ({ data: matterId, context: auth }) => {
	const bundle = await getMatterBundle({ data: matterId });
	if (!bundle) return {
		ok: false,
		error: "NOT_FOUND"
	};
	const gated = await gateAi(auth.userId, { demo: looksLikeSample({ title: bundle.matter.title }) });
	if (!gated.ok) return gated;
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI_UNAVAILABLE"
	};
	const stage = stageDef(bundle.matter.proceeding, bundle.matter.stage);
	const lastHearing = bundle.hearings[0];
	const lastOrder = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
	const context = [
		`Title: ${bundle.matter.title}`,
		`Court: ${bundle.matter.courtName} ${bundle.matter.caseNumber}`,
		`Proceeding: ${bundle.matter.proceeding} · stage ${bundle.matter.stage}`,
		`Stage meaning: ${stage?.what ?? ""}`,
		`Parties: ${bundle.matter.parties.map((p) => `${p.role} ${p.name}`).join("; ")}`,
		`Our side: ${bundle.matter.ourSide}`,
		`Notes: ${bundle.matter.notes}`,
		`Last hearing: ${lastHearing ? `${lastHearing.listedOn} ${lastHearing.purpose} ${lastHearing.outcome}` : "none"}`,
		`Last order: ${lastOrder?.body.slice(0, 2500) ?? "none"}`,
		`Open tasks: ${bundle.tasks.filter((t) => t.status === "open").map((t) => `${t.origin}: ${t.title}`).join(" | ")}`,
		`Deadlines: ${bundle.deadlines.filter((d) => d.status === "open").map((d) => `${d.dueOn} ${d.origin}: ${d.title}`).join(" | ")}`,
		`Timeline: ${bundle.timeline.slice(0, 12).map((e) => `${e.happenedOn} ${e.title}`).join(" | ")}`
	].join("\n");
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 25000);
	try {
		const res = await fetch("https://api.x.ai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`
			},
			signal: controller.signal,
			body: JSON.stringify({
				model: "grok-4.5",
				temperature: .2,
				max_tokens: 1600,
				response_format: { type: "json_object" },
				messages: [{
					role: "system",
					content: `Prepare a hearing brief for an Indian advocate. JSON only:
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
Separate court directions from suggestions. Do not invent citations. Not legal advice.`
				}, {
					role: "user",
					content: context
				}]
			})
		});
		if (!res.ok) return {
			ok: false,
			error: "AI_UNAVAILABLE"
		};
		const payload = await res.json();
		return {
			ok: true,
			brief: briefSchema.parse(pullJson(payload.choices?.[0]?.message?.content ?? ""))
		};
	} catch {
		return {
			ok: false,
			error: "PARSE"
		};
	} finally {
		clearTimeout(timer);
	}
});
