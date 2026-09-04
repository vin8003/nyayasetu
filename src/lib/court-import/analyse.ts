import { parseIndianDate } from "./dates.ts";
import { eventKey } from "./chronology.ts";
import type { ExtractedEvent, NormalizedOrder } from "./types.ts";

function pullJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("PARSE");
  return JSON.parse(text.slice(start, end + 1));
}

export async function enrichChronology(
  orders: NormalizedOrder[],
  existing: ExtractedEvent[],
): Promise<ExtractedEvent[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return [];
  const available = orders.filter((o) => o.available && o.body.trim().length > 40);
  if (available.length === 0) return [];
  const bundle = available
    .slice(0, 8)
    .map((o) => `--- ${o.title} (${o.orderDate ?? ""}) ---\n${o.body.slice(0, 1200)}`)
    .join("\n\n")
    .slice(0, 9000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "grok-4.20-0309-non-reasoning",
        temperature: 0.1,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Extract a chronological case history from Indian court orders. JSON only:
{"events":[{"date":"YYYY-MM-DD","title":"short event","detail":"what happened","quote":"short quote","sourceTitle":"order title","deadline":"YYYY-MM-DD or null"}]}
Rules: do not invent dates. Every event must quote the order. Leave deadline null unless the order states or clearly computes it. No legal advice.`,
          },
          { role: "user", content: bundle },
        ],
      }),
    });
    if (!res.ok) return [];
    const text = (await res.json() as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
    const parsed = pullJson(text) as {
      events?: Array<{
        date?: string;
        title?: string;
        detail?: string;
        quote?: string;
        sourceTitle?: string;
        deadline?: string | null;
      }>;
    };
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
        quote: (row.quote ?? "").trim().slice(0, 300),
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
