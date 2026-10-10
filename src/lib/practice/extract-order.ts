// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample-ids";
import { proceedingDef } from "./workflow";
import { INDIAN_LAW_CONTEXT, todayLine } from "@/lib/ai/context";
import { pullJson as pullJsonShared } from "@/lib/ai/json";
import { DEFAULT_FAST_MODEL, fastModel } from "@/lib/ai/models";
import { sendWithFallback, withRepairTurn } from "@/lib/ai/retry";
import { chatJsonFormat, list, nullable, obj, str, strEnum } from "@/lib/ai/schema";
import { XaiHttpError, chatText } from "@/lib/ai/xai-response";

const EXTRACT_TIMEOUT_MS = 40_000;
const EXTRACT_MIN_RETRY_MS = 12_000;

export const inputSchema = z.object({
	matterTitle: z.string().max(240),
	proceeding: z.string().max(40),
	stage: z.string().max(60),
	orderText: z.string().trim().min(40).max(40000),
	orderDate: z.string().max(40).nullable().optional()
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
	orderDate: z.string().nullable().catch(null),
	caveats: z.array(z.string()).catch([])
});
export function pullJson(text) {
	return pullJsonShared(text);
}
export function stageChoices(proceeding) {
	return proceedingDef(proceeding).stages.map((s) => ({ id: s.id, label: s.label }));
}
export function extractJsonSchema(stageIds) {
	return obj({
		summary: str("one paragraph of what the court actually ordered"),
		nextHearing: nullable(obj({ date: str("YYYY-MM-DD"), purpose: str() })),
		directions: list(obj({
			text: str("operative direction"),
			party: str("who must comply"),
			deadline: nullable(str("YYYY-MM-DD")),
			quote: str("verbatim words from the order")
		})),
		suggestedTasks: list(obj({ title: str("lawyer follow-up"), reason: str() })),
		stageHint: nullable(strEnum(stageIds)),
		orderDate: nullable(str("YYYY-MM-DD")),
		caveats: list(str())
	});
}
export function extractSystem(stages) {
	return `You extract structured data from Indian court orders for a lawyer's practice assistant.
Return JSON only:
{
  "summary": "one paragraph of what the court actually ordered",
  "nextHearing": { "date": "YYYY-MM-DD", "purpose": "" } | null,
  "directions": [{ "text": "operative direction", "party": "who must comply", "deadline": "YYYY-MM-DD or null", "quote": "short verbatim quote from the order" }],
  "suggestedTasks": [{ "title": "lawyer follow-up", "reason": "why" }],
  "stageHint": "workflow stage id or null",
  "orderDate": "YYYY-MM-DD printed on the order, or null",
  "caveats": ["anything inferred rather than explicit"]
}
Rules:
- summary: who appeared, what was argued or recorded, what was ordered, and the next date — in plain words, no padding.
- directions[] are only what the COURT ordered (file, deposit, serve, appear, produce, comply). Never put a lawyer to-do there. quote must be the order's exact words.
- party: the party or officer who must comply, as named in the order (e.g. "Defendant No. 2", "SHO, PS Saket", "Registry").
- Deadlines: if the order gives a date, use it. If it gives a period ("within four weeks", "two weeks from today"), compute it from the order date (stated in the order, else the order date given in the input) and say in caveats which base date you used. If no base date is known, leave deadline null and explain in caveats.
- nextHearing: the "List on / put up on / renotify on" date. null if none.
- suggestedTasks[] are CiteBench suggestions for the advocate (draft, file, collect, brief client), never court directions.
- stageHint: the stage the matter is at after this order, chosen from: ${stages.map((s) => `${s.id} (${s.label})`).join(", ")} — or null if the order does not move the stage.
- orderDate: the date of this order as YYYY-MM-DD, or null if the order does not state one.
- Do not give legal advice. Do not invent case law.

${INDIAN_LAW_CONTEXT}`;
}
export function extractUser(data, now = new Date()) {
	return [
		todayLine(now),
		`Matter: ${data.matterTitle}`,
		`Proceeding: ${data.proceeding}`,
		`Current stage: ${data.stage}`,
		data.orderDate ? `Order date (from the court record): ${data.orderDate}` : "Order date: read it from the order.",
		"",
		`Order text:\n${data.orderText}`
	].join("\n");
}
export async function runExtractOrder(userId, data) {
	const gated = await gateAi(userId, { demo: looksLikeSample({ title: data.matterTitle }) });
	if (!gated.ok) return gated;
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) return {
		ok: false,
		error: "AI_UNAVAILABLE"
	};
	const stages = stageChoices(data.proceeding);
	const model = fastModel();
	const messages = [{
		role: "system",
		content: extractSystem(stages)
	}, {
		role: "user",
		content: extractUser(data)
	}];
	const deadline = Date.now() + EXTRACT_TIMEOUT_MS;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
	try {
		const send = async (body) => {
			const res = await fetch("https://api.x.ai/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`
				},
				signal: controller.signal,
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new XaiHttpError(res.status, await res.text().catch(() => ""));
			return chatText(await res.json());
		};
		const { value: parsed } = await sendWithFallback({
			tag: "extract-order",
			send,
			build: ({ legacy, repair }) => ({
				model: legacy ? DEFAULT_FAST_MODEL : model,
				temperature: .1,
				max_tokens: 2500,
				response_format: legacy ? { type: "json_object" } : chatJsonFormat("order_extract", extractJsonSchema(stages.map((s) => s.id))),
				messages: withRepairTurn(messages, repair)
			}),
			parse: (text) => extractSchema.parse(pullJson(text)),
			deadline,
			minRetryMs: EXTRACT_MIN_RETRY_MS
		});
		const next = parsed.nextHearing && parsed.nextHearing.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextHearing.date) ? parsed.nextHearing : null;
		const stageHint = parsed.stageHint && stages.some((s) => s.id === parsed.stageHint) ? parsed.stageHint : null;
		const orderDate = parsed.orderDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.orderDate) ? parsed.orderDate : null;
		return {
			ok: true,
			extract: {
				summary: parsed.summary,
				nextHearing: next,
				directions: parsed.directions.filter((d) => d.text.trim()),
				suggestedTasks: parsed.suggestedTasks.filter((t) => t.title.trim()),
				stageHint,
				orderDate,
				caveats: parsed.caveats
			}
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "";
		if (err instanceof XaiHttpError) return {
			ok: false,
			error: "AI_UNAVAILABLE"
		};
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
}
export const extractOrder = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => inputSchema.parse(input)).handler(async ({ data, context }) => {
	return runExtractOrder(context.userId, data);
});
