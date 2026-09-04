import { addRelativeDeadline, parseIndianDate } from "./dates.ts";
import type { ExtractedEvent, NormalizedCase, NormalizedOrder } from "./types.ts";

export type ExtractedDeadline = {
  title: string;
  dueOn: string;
  origin: "court_direction" | "ai_inference";
  sourceQuote: string;
  sourceTitle: string;
};

const ACTION_PATTERNS: Array<{ re: RegExp; title: string }> = [
  { re: /written statement/i, title: "File written statement" },
  { re: /\brejoinder\b/i, title: "File rejoinder" },
  { re: /\breplication\b/i, title: "File replication" },
  { re: /\breply\b/i, title: "File reply" },
  { re: /\baffidavit\b/i, title: "File affidavit" },
  { re: /\bcounter\s+affidavit\b/i, title: "File counter affidavit" },
  { re: /\bcompliance\b/i, title: "Comply with the direction" },
  { re: /\bprocess fee\b/i, title: "Pay process fee" },
];

export function extractDeadlinesFromOrder(order: NormalizedOrder): ExtractedDeadline[] {
  if (!order.available || !order.body.trim() || !order.orderDate) return [];
  const text = order.body.replace(/\s+/g, " ").trim();
  const out: ExtractedDeadline[] = [];
  const seen = new Set<string>();

  const explicit = [...text.matchAll(/\bby\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/gi)];
  for (const match of explicit) {
    const due = parseIndianDate(match[1]);
    if (!due) continue;
    const title = ACTION_PATTERNS.find((p) => p.re.test(text))?.title ?? "Comply as directed";
    const key = `${due}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      title,
      dueOn: due,
      origin: "court_direction",
      sourceQuote: text.slice(Math.max(0, (match.index ?? 0) - 60), (match.index ?? 0) + 80),
      sourceTitle: order.title,
    });
  }

  const relative = addRelativeDeadline(order.orderDate, text);
  if (relative) {
    const title = ACTION_PATTERNS.find((p) => p.re.test(text))?.title ?? "Comply as directed";
    const key = `${relative}|${title}`;
    if (!seen.has(key)) {
      out.push({
        title,
        dueOn: relative,
        origin: "court_direction",
        sourceQuote: (text.match(/within\s+\d+\s+(days?|weeks?|months?)/i) ?? [text.slice(0, 120)])[0],
        sourceTitle: order.title,
      });
    }
  }
  return out;
}

export function extractDeadlines(
  orders: NormalizedOrder[],
  _events: ExtractedEvent[],
  cse: NormalizedCase | null,
): ExtractedDeadline[] {
  const out: ExtractedDeadline[] = [];
  const seen = new Set<string>();
  function push(row: ExtractedDeadline) {
    const key = `${row.dueOn}|${row.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  }
  for (const order of orders) {
    for (const d of extractDeadlinesFromOrder(order)) push(d);
  }
  if (cse?.nextHearingOn) {
    push({
      title: "Next hearing",
      dueOn: cse.nextHearingOn,
      origin: "court_direction",
      sourceQuote: `Next hearing date ${cse.nextHearingOn}`,
      sourceTitle: "Case status",
    });
  }
  return out.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
