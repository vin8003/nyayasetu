import { IMPORT_STATUSES, type ImportStatus, type ImportStep } from "./types.ts";

const VISIBLE: ImportStatus[] = [
  "CONNECTING",
  "SEARCHING",
  "CAPTCHA_REQUIRED",
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
  CAPTCHA_REQUIRED: "CAPTCHA on the court site",
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

export function buildSteps(current: ImportStatus, captcha: boolean): ImportStep[] {
  const skipCaptcha = !captcha && current !== "CAPTCHA_REQUIRED";
  const list = VISIBLE.filter((id) => (skipCaptcha ? id !== "CAPTCHA_REQUIRED" : true));
  const terminal: ImportStatus[] = ["COMPLETED", "PARTIAL", "FAILED"];
  const idx = list.indexOf(current === "PARTIAL" || current === "FAILED" ? "COMPLETED" : current);
  return list.map((id, i) => ({
    id,
    label: id === "COMPLETED" && current === "PARTIAL" ? LABELS.PARTIAL : LABELS[id],
    done: terminal.includes(current) ? i <= list.length - 1 && (current !== "FAILED" || i < list.length - 1) : i < idx,
    active: !terminal.includes(current) && i === idx,
  }));
}

export function isTerminal(status: ImportStatus): boolean {
  return status === "COMPLETED" || status === "PARTIAL" || status === "FAILED";
}

export { IMPORT_STATUSES };
