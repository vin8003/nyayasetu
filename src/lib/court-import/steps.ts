import { IMPORT_STATUSES, type ImportStatus, type ImportStep } from "./types.ts";

const VISIBLE: ImportStatus[] = [
  "CONNECTING",
  "SEARCHING",
  "RETRIEVING_CASE",
  "RETRIEVING_HISTORY",
  "DOWNLOADING_ORDERS",
  "DEDUPLICATING",
  "ANALYSING",
  "BUILDING_TIMELINE",
  "COMPLETED",
];

const LABELS: Record<ImportStatus, string> = {
  CREATED: "Created",
  CONNECTING: "Connecting to court source",
  SEARCHING: "Searching the case",
  CAPTCHA_REQUIRED: "Live CNR uses the Partner API",
  RETRIEVING_CASE: "Retrieving case details",
  RETRIEVING_HISTORY: "Retrieving historical orders",
  DOWNLOADING_ORDERS: "Importing documents",
  DEDUPLICATING: "Deduplicating",
  ANALYSING: "Analysing case history",
  BUILDING_TIMELINE: "Building the timeline",
  COMPLETED: "Completed",
  PARTIAL: "Completed with gaps",
  FAILED: "Failed",
};

export function stepLabel(status: ImportStatus): string {
  return LABELS[status];
}

export function buildSteps(current: ImportStatus, _captcha = false): ImportStep[] {
  const list = VISIBLE;
  const mapped: ImportStatus = current === "CAPTCHA_REQUIRED" ? "FAILED" : current;
  const terminal: ImportStatus[] = ["COMPLETED", "PARTIAL", "FAILED"];
  const idx = list.indexOf(mapped === "PARTIAL" || mapped === "FAILED" ? "COMPLETED" : mapped);
  return list.map((id, i) => ({
    id,
    label: id === "COMPLETED" && mapped === "PARTIAL" ? LABELS.PARTIAL : LABELS[id],
    done: terminal.includes(mapped) ? i <= list.length - 1 && (mapped !== "FAILED" || i < list.length - 1) : i < idx,
    active: !terminal.includes(mapped) && i === idx,
  }));
}

export function isTerminal(status: ImportStatus): boolean {
  return status === "COMPLETED" || status === "PARTIAL" || status === "FAILED";
}

export { IMPORT_STATUSES };
