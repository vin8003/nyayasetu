import { addRelativeDeadline, firstDateIn, isIsoDate, parseIndianDate } from "./dates.ts";
import type { ExtractedEvent, NormalizedOrder } from "./types.ts";

type Rule = {
  kind: string;
  title: string;
  test: (text: string) => boolean;
  origin: ExtractedEvent["origin"];
};

const RULES: Rule[] = [
  {
    kind: "filing",
    title: "Matter instituted",
    test: (t) => /\b(instituted|plaint is presented|petition is filed|suit is instituted)\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Notice issued",
    test: (t) => /\bissue[d]?\s+notice\b/.test(t) || /\bnotice\s+(is|be)\s+issued\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Summons issued",
    test: (t) => /\bsummons?\s+(issued|to issue)\b/.test(t) || /\bissue summons\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "hearing",
    title: "Respondent appeared",
    test: (t) =>
      /\b(respondent|defendant|accused)\s+(appeared|appears|has appeared)\b/.test(t) ||
      /\bappeared through counsel\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Written statement directed",
    test: (t) => /\bwritten statement\b/.test(t) && /\b(directed|to be filed|within)\b/.test(t) && !/\bwritten statement filed\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "filing",
    title: "Written statement filed",
    test: (t) => /\bwritten statement filed\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Reply / rejoinder directed",
    test: (t) =>
      /\b(replication|rejoinder|counter affidavit)\b/.test(t) &&
      /\b(directed|to be filed|within|if any)\b/.test(t) &&
      !/\b(replication|rejoinder) filed\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Issues framed",
    test: (t) => /\bissues?\s+fram/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Evidence directed",
    test: (t) => /\blisted for evidence\b/.test(t) || /\bto lead evidence\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "hearing",
    title: "Listed for arguments",
    test: (t) => /\blisted for arguments?\b/.test(t) || /\bput up for arguments?\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Stay / interim relief",
    test: (t) => /\b(stay|injunction|interim)\b/.test(t) && /\b(granted|issued|vacated|refused)\b/.test(t),
    origin: "court_direction",
  },
  {
    kind: "order",
    title: "Matter disposed",
    test: (t) => /\b(disposed of|dismissed|decreed|allowed|rejected)\b/.test(t) && /\b(petition|suit|appeal|application)\b/.test(t),
    origin: "court_direction",
  },
];

function quoteAround(text: string, needle: RegExp, fallback: string): string {
  const match = text.match(needle);
  if (!match || match.index == null) return fallback.slice(0, 180);
  const start = Math.max(0, match.index - 40);
  return text.slice(start, start + 180).replace(/\s+/g, " ").trim();
}

export function extractEventsFromOrder(order: NormalizedOrder): ExtractedEvent[] {
  if (!order.available || !order.body.trim()) return [];
  const text = order.body.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const orderDate = order.orderDate || firstDateIn(text);
  if (!orderDate) return [];
  const sourceTitle = order.title || `Order dated ${orderDate}`;
  const events: ExtractedEvent[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    if (!rule.test(lower)) continue;
    const key = `${orderDate}|${rule.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const deadline = addRelativeDeadline(orderDate, lower);
    const next = parseIndianDate(
      (lower.match(/next (?:date(?: of hearing)?|hearing)[:\s]+(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i) ?? [])[1],
    );
    events.push({
      happenedOn: orderDate,
      kind: rule.kind,
      title: rule.title,
      detail: `${rule.title} on ${sourceTitle}.`,
      origin: rule.origin,
      verification: "court_imported",
      quote: quoteAround(text, new RegExp(rule.title.split(" ")[0], "i"), text),
      sourceTitle,
      deadline,
      action: deadline ? rule.title : next ? "Next hearing" : null,
    });
  }

  if (events.length === 0) {
    events.push({
      happenedOn: orderDate,
      kind: "order",
      title: sourceTitle,
      detail: text.slice(0, 280),
      origin: "court_direction",
      verification: "court_imported",
      quote: text.slice(0, 180),
      sourceTitle,
      deadline: addRelativeDeadline(orderDate, lower),
      action: null,
    });
  }

  const nextHearing = nextHearingFromText(lower, orderDate);
  if (nextHearing && !events.some((e) => e.title === "Next date fixed")) {
    events.push({
      happenedOn: orderDate,
      kind: "hearing",
      title: "Next date fixed",
      detail: `Next hearing ${nextHearing}.`,
      origin: "court_direction",
      verification: "court_imported",
      quote: quoteAround(text, /next/i, text),
      sourceTitle,
      deadline: null,
      action: "Next hearing",
    });
  }

  return events;
}

export function nextHearingFromText(text: string, fallbackOrderDate?: string): string | null {
  const labeled = text.match(
    /next\s+(?:date(?:\s+of\s+hearing)?|hearing(?:\s+date)?)\s*[:\-]\s*(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+,?\s+\d{4})/i,
  );
  if (labeled) return parseIndianDate(labeled[1]);
  const listed = text.match(/\b(?:listed|put up)\s+on\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4})/i);
  if (listed) return parseIndianDate(listed[1]);
  if (fallbackOrderDate && isIsoDate(fallbackOrderDate)) {
    const rel = addRelativeDeadline(fallbackOrderDate, text);
    if (rel && /listed|hearing/.test(text)) return rel;
  }
  return null;
}

export function buildChronology(orders: NormalizedOrder[]): ExtractedEvent[] {
  const dated = [...orders].sort((a, b) => (a.orderDate ?? "").localeCompare(b.orderDate ?? ""));
  const out: ExtractedEvent[] = [];
  const seen = new Set<string>();
  for (const order of dated) {
    for (const event of extractEventsFromOrder(order)) {
      const key = `${event.happenedOn}|${event.title}|${event.sourceTitle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(event);
    }
  }
  return out.sort((a, b) => a.happenedOn.localeCompare(b.happenedOn) || a.title.localeCompare(b.title));
}

export function eventKey(event: Pick<ExtractedEvent, "happenedOn" | "title">): string {
  return `${event.happenedOn}|${event.title.trim().toLowerCase()}`;
}
