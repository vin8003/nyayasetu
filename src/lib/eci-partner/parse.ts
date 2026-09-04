import { parseIndianDate } from "../court-import/dates.ts";
import type { NormalizedOrder } from "../court-import/types.ts";
import { ECI_BASE, MIN_ORDER_BODY, type PartnerCasePreview, type PartnerParseResult } from "./types.ts";
import { normalizeCnr } from "./cnr.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function obj(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function requestIdOf(json: unknown): string {
  const root = obj(json);
  return str(obj(root.meta).request_id) || str(root.request_id);
}

function fileStem(name: string): string {
  return name
    .trim()
    .split(/[/\\]/)
    .pop()
    ?.replace(/\?.*$/, "")
    .replace(/\.(pdf|md)$/i, "")
    .toLowerCase() ?? "";
}

function sourceUrl(cnr: string, orderUrl: string): string {
  const file = (orderUrl || "").split("/").pop()?.split("?")[0] || "";
  if (file && /\.pdf$/i.test(file)) {
    return `${ECI_BASE}/api/partner/case/${cnr}/order/${file}`;
  }
  return `${ECI_BASE}/api/partner/case/${cnr}`;
}

function asDate(value: unknown): string | null {
  const raw = str(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return parseIndianDate(raw);
}

function usableBody(value: string): string {
  return value.trim();
}

function isStubDescription(value: string): boolean {
  const t = value.trim().toLowerCase().replace(/\s+/g, " ");
  return (
    t.length < MIN_ORDER_BODY ||
    /^(view order|copy of order|copy of judicial proceedings|order)$/i.test(t)
  );
}

function orderFromMeta(
  cnr: string,
  row: Record<string, unknown>,
  index: number,
  kind: string,
  body: string,
): NormalizedOrder {
  const orderUrl = str(row.orderUrl) || str(row.pdfFile) || str(row.fileName) || str(row.fileUrl);
  const date = asDate(row.orderDate) || asDate(row.date);
  const titleRaw =
    str(row.orderTitle) ||
    str(row.description) ||
    str(row.orderType) ||
    str(row.title) ||
    kind;
  const title = date ? `Order dated ${date} — ${titleRaw}`.slice(0, 240) : titleRaw.slice(0, 240) || `Order ${index + 1}`;
  const external =
    fileStem(orderUrl) ||
    str(row.orderId) ||
    `eci:${cnr}:${date || "undated"}:${index}`;
  const text = usableBody(body);
  return {
    externalId: external.slice(0, 240),
    orderDate: date,
    orderType: str(row.orderType) || kind,
    title,
    sourceUrl: sourceUrl(cnr, orderUrl),
    filename: (orderUrl.split("/").pop() || "").split("?")[0],
    body: text.slice(0, 40000),
    available: text.length >= MIN_ORDER_BODY,
    error: text.length >= MIN_ORDER_BODY ? undefined : "No order text from Partner API.",
  };
}

function fileList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const wrap = obj(value);
  if (Array.isArray(wrap.files)) return wrap.files;
  return [];
}

function fileBody(row: Record<string, unknown>): string {
  return usableBody(str(row.markdownContent) || str(row.markdown) || str(row.ocrText));
}

function collectOrderRows(data: Record<string, unknown>, caseData: Record<string, unknown>): Array<Record<string, unknown> & { _kind: string }> {
  const rows: Array<Record<string, unknown> & { _kind: string }> = [];
  const seen = new Set<string>();
  const push = (kind: string, value: unknown) => {
    for (const item of arr(value)) {
      const row = obj(item);
      const key = `${str(row.orderUrl)}|${str(row.orderDate)}|${str(row.description)}|${str(row.orderType)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ ...row, _kind: kind });
    }
  };
  push("interim", data.interimOrders);
  push("judgment", data.judgmentOrders);
  push("order", data.orders);
  push("interim", caseData.interimOrders);
  push("judgment", caseData.judgmentOrders);
  push("order", caseData.orders);
  return rows;
}

function collectFiles(data: Record<string, unknown>, caseData: Record<string, unknown>): Array<{ stem: string; body: string; pdf: string }> {
  const items = [
    ...fileList(data.files),
    ...fileList(caseData.files),
    ...fileList(data.orderFiles),
  ];
  const out: Array<{ stem: string; body: string; pdf: string }> = [];
  const seen = new Set<string>();
  for (const item of items) {
    const row = obj(item);
    const body = fileBody(row);
    if (!body) continue;
    const pdf = str(row.pdfFile) || str(row.fileName) || str(row.fileUrl) || str(row.markdownFile) || str(row.orderUrl);
    const stem = fileStem(pdf);
    const key = stem || body.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ stem, body, pdf });
  }
  return out;
}

function previewFrom(caseData: Record<string, unknown>, cnr: string): PartnerCasePreview {
  const titled = str(caseData.caseTitle);
  const petitioners = arr(caseData.petitioners).map(str).filter(Boolean);
  const respondents = arr(caseData.respondents).map(str).filter(Boolean);
  const title =
    titled ||
    (petitioners[0] && respondents[0] ? `${petitioners[0]} v ${respondents[0]}` : cnr);
  return {
    cnr,
    title,
    courtName: str(caseData.courtName),
    caseNumber: str(caseData.registrationNumber) || str(caseData.caseNumber) || str(caseData.caseType),
    status: str(caseData.caseStatus),
    nextHearingOn: asDate(caseData.nextHearingDate),
  };
}

/**
 * Map a Partner API JSON payload to orders. Uses markdownContent and
 * explicit order descriptions only. Hearings and AI summaries are not
 * turned into order bodies.
 */
export function parsePartnerCase(json: unknown): PartnerParseResult {
  const root = obj(json);
  const data = obj(root.data ?? json);
  const caseData = obj(data.courtCaseData);
  const cnr = normalizeCnr(str(caseData.cnr) || str(data.cnr));
  const files = collectFiles(data, caseData);
  const rows = collectOrderRows(data, caseData);
  const usedStems = new Set<string>();
  const orders: NormalizedOrder[] = [];

  rows.forEach((row, index) => {
    const stem = fileStem(str(row.orderUrl) || str(row.pdfFile) || str(row.fileName));
    const matched = files.find((f) => f.stem && (f.stem === stem || f.stem.endsWith(stem) || stem.endsWith(f.stem)));
    if (matched) usedStems.add(matched.stem);
    const description = usableBody(str(row.description) || str(row.orderTitle));
    const fromDesc = isStubDescription(description) ? "" : description;
    const body = matched?.body || (fromDesc.length >= MIN_ORDER_BODY ? fromDesc : "");
    orders.push(orderFromMeta(cnr, row, index, row._kind, body));
  });

  files.forEach((file, index) => {
    if (usedStems.has(file.stem)) return;
    orders.push(
      orderFromMeta(
        cnr,
        { orderUrl: file.pdf, orderTitle: "Order" },
        rows.length + index,
        "file",
        file.body,
      ),
    );
  });

  return {
    preview: previewFrom(caseData, cnr),
    orders,
    requestId: requestIdOf(json),
  };
}

export function hasLandableBody(orders: NormalizedOrder[]): boolean {
  return orders.some((order) => order.available && order.body.trim().length >= MIN_ORDER_BODY);
}

export function pendingOrderPdfs(orders: NormalizedOrder[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const order of orders) {
    if (order.available && order.body.trim().length >= MIN_ORDER_BODY) continue;
    const file = (order.filename || "").split("?")[0];
    if (!/\.pdf$/i.test(file)) continue;
    const key = file.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(file);
  }
  return names;
}

export function applyMarkdownToOrders(orders: NormalizedOrder[], file: string, body: string): number {
  const text = body.trim().slice(0, 40000);
  if (text.length < MIN_ORDER_BODY || isStubDescription(text)) return 0;
  const stem = fileStem(file);
  if (!stem) return 0;
  let filled = 0;
  for (const order of orders) {
    const other = fileStem(order.filename);
    if (!other || (other !== stem && !other.endsWith(stem) && !stem.endsWith(other))) continue;
    order.body = text;
    order.available = true;
    order.error = undefined;
    filled += 1;
  }
  return filled;
}
