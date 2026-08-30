// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample";

export const inputSchema = z.object({
	matterTitle: z.string().max(240),
	proceeding: z.string().max(40),
	stage: z.string().max(60),
	orderText: z.string().trim().min(40).max(40000)
});
export const extractSchema = z.object({
	summary: z.string().catch(""),
	nextHearing: z.object({
		date: z.string(),
		purpose: z.string()
	}).nullable().catch(null),
	directions: z.array(z.object({
		text: z.string().catch(""),
		party: z.string().catch(""),
		deadline: z.string().nullable().catch(null),
		quote: z.string().catch("")
	})).catch([]),
	suggestedTasks: z.array(z.object({
		title: z.string().catch(""),
		reason: z.string().catch("")
	})).catch([]),
	stageHint: z.string().nullable().catch(null),
	caveats: z.array(z.string()).catch([])
});
export function pullJson(text) {
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("PARSE");
	return JSON.parse(text.slice(start, end + 1));
}
export const extractOrder = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => inputSchema.parse(input)).handler(async ({ data, context }) => {
	const gated = await gateAi(context.userId, { demo: looksLikeSample({ title: data.matterTitle }) });
	if (!gated.ok) return gated;
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI_UNAVAILABLE"
	};
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
				temperature: .1,
				max_tokens: 1800,
				response_format: { type: "json_object" },
				messages: [{
					role: "system",
					content: `You extract structured data from Indian court orders for a lawyer's practice assistant.
Return JSON only:
{
  "summary": "one paragraph of what the court actually ordered",
  "nextHearing": { "date": "YYYY-MM-DD or empty", "purpose": "" } | null,
  "directions": [{ "text": "operative direction", "party": "who must comply", "deadline": "YYYY-MM-DD or null", "quote": "short quote from the order" }],
  "suggestedTasks": [{ "title": "lawyer follow-up", "reason": "why" }],
  "stageHint": "workflow stage id or null",
  "caveats": ["anything inferred rather than explicit"]
}
Rules:
- directions[] are only what the COURT ordered. Never put a lawyer to-do there.
- suggestedTasks[] are CiteBench suggestions, never court directions.
- If a date is inferred, put it in caveats and leave deadline null unless the order states it.
- stageHint must be one of: intake, notice, draft_plaint, filing, scrutiny, registered, summons, service, ws_pending, replication, interim, issues, plaintiff_evidence, defendant_evidence, arguments, judgment, ex_parte, closed, incident, fir, investigation, bail, chargesheet, cognizance, charge, prosecution_evidence, accused_statement, defence, drafting, admission, counter, final_hearing, decision, hearing, award, s9, tribunal, process, filed — or null.
- Do not give legal advice. Do not invent case law.`
				}, {
					role: "user",
					content: `Matter: ${data.matterTitle}\nProceeding: ${data.proceeding}\nCurrent stage: ${data.stage}\n\nOrder text:\n${data.orderText}`
				}]
			})
		});
		if (!res.ok) return {
			ok: false,
			error: "AI_UNAVAILABLE"
		};
		const text = (await res.json()).choices?.[0]?.message?.content ?? "";
		const parsed = extractSchema.parse(pullJson(text));
		const next = parsed.nextHearing && parsed.nextHearing.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextHearing.date) ? parsed.nextHearing : null;
		return {
			ok: true,
			extract: {
				summary: parsed.summary,
				nextHearing: next,
				directions: parsed.directions.filter((d) => d.text.trim()),
				suggestedTasks: parsed.suggestedTasks.filter((t) => t.title.trim()),
				stageHint: parsed.stageHint,
				caveats: parsed.caveats
			}
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "";
		if (message.includes("abort") || message.toLowerCase().includes("timeout")) return {
			ok: false,
			error: "TIMEOUT"
		};
		return {
			ok: false,
			error: "PARSE"
		};
	} finally {
		clearTimeout(timer);
	}
});
