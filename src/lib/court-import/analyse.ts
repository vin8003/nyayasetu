import { parseIndianDate } from "./dates.ts";
import { eventKey } from "./chronology.ts";
import type { ExtractedEvent, NormalizedOrder } from "./types.ts";
import { todayLine } from "../ai/context.ts";
import { pullJson } from "../ai/json.ts";
import { DEFAULT_FAST_MODEL, fastModel } from "../ai/models.ts";
import { sendWithFallback, withRepairTurn } from "../ai/retry.ts";
import { chatJsonFormat, list, nullable, obj, str } from "../ai/schema.ts";
import { XaiHttpError, chatText } from "../ai/xai-response.ts";

const CHRONOLOGY_TIMEOUT_MS = 35_000;
const CHRONOLOGY_MIN_RETRY_MS = 12_000;

const CHRONOLOGY_JSON_SCHEMA = obj({
  events: list(
    obj({
      date: str("YYYY-MM-DD"),
      title: str("short event"),
      detail: str("what happened"),
      quote: str("verbatim words from the order"),
      sourceTitle: str("order title as given"),
      deadline: nullable(str("YYYY-MM-DD")),
    }),
  ),
});

export const CHRONOLOGY_SYSTEM = `Extract a chronological case history from Indian court orders. JSON only:
{"events":[{"date":"YYYY-MM-DD","title":"short event","detail":"what happened","quote":"short verbatim quote","sourceTitle":"order title","deadline":"YYYY-MM-DD or null"}]}
Rules:
- One event per thing that happened: filing, appearance, notice issued or served, pleading filed, application moved or decided, evidence step, adjournment with reason, interim order, judgment.
- Dates: use the date the event happened as stated in the order; never invent one. Dates in Indian orders are day-first (12.03.2024 is 12 March 2024).
- quote must be copied exactly from the order text, 5–25 words.
- Leave deadline null unless the order states it or it follows from a stated period and the order date.
- Skip events already listed as known; add only what is missing.
- No legal advice.`;

const squash = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

export function buildChronologyUser(orders: NormalizedOrder[], existing: ExtractedEvent[], now: Date = new Date()): string {
  const bundle = orders
    .slice(0, 8)
    .map((o) => `--- ${o.title} (${o.orderDate ?? ""}) ---\n${o.body.slice(0, 3000)}`)
    .join("\n\n")
    .slice(0, 20000);
  const known = existing
    .slice(0, 40)
    .map((e) => `- ${e.happenedOn} ${e.title}`)
    .join("\n");
  return [todayLine(now), `Known events (do not repeat):\n${known || "(none)"}`, "", bundle].join("\n");
}

export function quoteIfVerbatim(quote: string, sources: string[]): string {
  const trimmed = quote.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  if (!trimmed) return "";
  const needle = squash(trimmed);
  return sources.some((source) => source.includes(needle)) ? trimmed.slice(0, 300) : "";
}

export async function enrichChronology(
  orders: NormalizedOrder[],
  existing: ExtractedEvent[],
): Promise<ExtractedEvent[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return [];
  const available = orders.filter((o) => o.available && o.body.trim().length > 40);
  if (available.length === 0) return [];
  const model = fastModel();
  const messages = [
    { role: "system", content: CHRONOLOGY_SYSTEM },
    { role: "user", content: buildChronologyUser(available, existing) },
  ];
  const sources = available.map((o) => squash(o.body));
  const deadline = Date.now() + CHRONOLOGY_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHRONOLOGY_TIMEOUT_MS);
  try {
    const send = async (body: object): Promise<string> => {
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
    const { value: parsed } = await sendWithFallback({
      tag: "chronology",
      send,
      build: ({ legacy, repair }) => ({
        model: legacy ? DEFAULT_FAST_MODEL : model,
        temperature: 0.1,
        max_tokens: 2500,
        response_format: legacy ? { type: "json_object" } : chatJsonFormat("chronology", CHRONOLOGY_JSON_SCHEMA),
        messages: withRepairTurn(messages, repair),
      }),
      parse: (text) =>
        pullJson(text) as {
          events?: Array<{
            date?: string;
            title?: string;
            detail?: string;
            quote?: string;
            sourceTitle?: string;
            deadline?: string | null;
          }>;
        },
      deadline,
      minRetryMs: CHRONOLOGY_MIN_RETRY_MS,
    });
    const have = new Set(existing.map(eventKey));
    const extra: ExtractedEvent[] = [];
    for (const row of parsed.events ?? []) {
      const happenedOn = parseIndianDate(row.date ?? "") ?? (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : null);
      const title = (row.title ?? "").trim();
      if (!happenedOn || !title) continue;
      const key = `${happenedOn}|${title}`;
      if (have.has(key.toLowerCase()) || have.has(eventKey({ happenedOn, title }))) continue;
      extra.push({
        happenedOn,
        kind: "order",
        title,
        detail: (row.detail ?? "").trim().slice(0, 800),
        origin: "ai_inference",
        verification: "ai_inferred",
        // Keep a quote only if it really is in an order; a paraphrase posing as a quote is worse than none.
        quote: quoteIfVerbatim(row.quote ?? "", sources),
        sourceTitle: (row.sourceTitle ?? "").trim(),
        deadline: parseIndianDate(row.deadline ?? "") || null,
        action: null,
      });
      have.add(eventKey({ happenedOn, title }));
    }
    return extra;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
