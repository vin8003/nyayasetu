import { parseIndianDate } from "../court-import/dates.ts";
import type { NormalizedOrder } from "../court-import/types.ts";
import { IK_MIN_BODY, type IkDocument, type IkSearchHit } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (isRecord(value)) return str(value.content ?? value.text ?? value.html ?? value.doc);
  return "";
}

const NAMED: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, ent: string) => {
      const lower = ent.toLowerCase();
      if (NAMED[lower]) return NAMED[lower];
      if (lower.startsWith("#x")) return String.fromCharCode(Number.parseInt(lower.slice(2), 16) || 32);
      if (lower.startsWith("#")) return String.fromCharCode(Number.parseInt(lower.slice(1), 10) || 32);
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

function listFrom(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.docs)) return root.docs;
  if (Array.isArray(root.documents)) return root.documents;
  if (Array.isArray(root.results)) return root.results;
  if (isRecord(root.docs) && Array.isArray(root.docs.doc)) return root.docs.doc;
  if (typeof root.raw === "string" && root.raw.includes("<")) return xmlDocs(root.raw);
  return [];
}

function xmlDocs(raw: string): unknown[] {
  const blocks = raw.match(/<(?:doc|document)\b[\s\S]*?<\/(?:doc|document)>/gi) ?? [];
  return blocks.map((block) => ({
    tid: block.match(/<(?:tid|tidno|docid)[^>]*>([^<]+)/i)?.[1] ?? block.match(/\btid=["']?(\d+)/i)?.[1] ?? "",
    title: block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
    headline: block.match(/<headline[^>]*>([\s\S]*?)<\/headline>/i)?.[1] ?? "",
    docsource: block.match(/<docsource[^>]*>([\s\S]*?)<\/docsource>/i)?.[1] ?? "",
    publishdate: block.match(/<publishdate[^>]*>([\s\S]*?)<\/publishdate>/i)?.[1] ?? "",
  }));
}

export function parseSearchHits(json: unknown): IkSearchHit[] {
  const root = isRecord(json) ? json : {};
  const hits: IkSearchHit[] = [];
  const seen = new Set<string>();
  for (const item of listFrom(root)) {
    const row = isRecord(item) ? item : {};
    const tid = str(row.tid || row.tidno || row.docid);
    if (!tid || seen.has(tid)) continue;
    seen.add(tid);
    hits.push({
      tid,
      title: stripHtml(str(row.title)),
      headline: stripHtml(str(row.headline)),
      docsource: str(row.docsource),
      publishdate: str(row.publishdate),
    });
  }
  return hits;
}

export function parseDocument(json: unknown, hit: IkSearchHit): IkDocument | null {
  const root = isRecord(json) ? json : {};
  const raw = str(root.doc) || str(root.document) || str(root.text) || (typeof root.raw === "string" ? root.raw : "");
  const body = stripHtml(raw).slice(0, 40000);
  if (body.length < IK_MIN_BODY) return null;
  const title = stripHtml(str(root.title)) || hit.title;
  const docsource = str(root.docsource) || hit.docsource;
  const publishdate = str(root.publishdate) || hit.publishdate;
  return {
    tid: hit.tid,
    title,
    headline: hit.headline,
    docsource,
    publishdate,
    body,
    sourceUrl: `https://indiankanoon.org/doc/${hit.tid}/`,
  };
}

export function mentionsCnr(text: string, cnr: string): boolean {
  const needle = cnr.replace(/[\s-]/g, "").toUpperCase();
  if (!needle) return false;
  return text.replace(/[\s-]/g, "").toUpperCase().includes(needle);
}

export function documentsToOrders(docs: IkDocument[], cnr: string): NormalizedOrder[] {
  const mapped = docs.map((doc, index) => {
    const date =
      parseIndianDate(doc.publishdate) ||
      (/^\d{4}-\d{2}-\d{2}/.test(doc.publishdate) ? doc.publishdate.slice(0, 10) : null);
    const title = date
      ? `Order dated ${date} — ${doc.title}`.slice(0, 240)
      : doc.title.slice(0, 240) || `Order ${index + 1}`;
    return {
      externalId: `ik:${doc.tid}`.slice(0, 240),
      orderDate: date,
      orderType: "order" as const,
      title,
      sourceUrl: doc.sourceUrl,
      filename: `${doc.tid}.html`,
      body: doc.body,
      available: doc.body.length >= IK_MIN_BODY,
    };
  });
  const matched = mapped.filter((order) => mentionsCnr(`${order.title}\n${order.body}`, cnr));
  return matched.length ? matched : mapped.filter((order) => order.available);
}

export function previewFromDocs(docs: IkDocument[], cnr: string) {
  const first = docs[0];
  return {
    cnr,
    title: first?.title || cnr,
    courtName: first?.docsource || "",
    caseNumber: "",
    status: "",
    nextHearingOn: null as string | null,
  };
}
