import { proceedingDef } from "./workflow.ts";

export function stageIndex(proceeding: string, stageId: string): number {
  return proceedingDef(proceeding).stages.findIndex((stage) => stage.id === stageId);
}

/** True when the proposed stage sits earlier in the proceeding than the current one. */
export function isStageReverse(proceeding: string, current: string, proposed: string | null | undefined): boolean {
  if (!proposed || proposed === current) return false;
  const from = stageIndex(proceeding, current);
  const to = stageIndex(proceeding, proposed);
  if (from < 0 || to < 0) return false;
  return to < from;
}

export function isEarlierOrderDate(orderDate: string | null | undefined, latest: string | null | undefined): boolean {
  const next = String(orderDate ?? "").slice(0, 10);
  const prev = String(latest ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || !/^\d{4}-\d{2}-\d{2}$/.test(prev)) return false;
  return next < prev;
}

/**
 * A previous-dated order, or a stage that sits behind the current one, must not
 * move the file backwards unless the advocate confirms.
 */
export function wouldMoveReverse(opts: {
  proceeding: string;
  currentStage: string;
  proposedStage?: string | null;
  orderDate?: string | null;
  latestDate?: string | null;
}): boolean {
  const stageBack = isStageReverse(opts.proceeding, opts.currentStage, opts.proposedStage);
  const datedBack =
    Boolean(opts.proposedStage) &&
    opts.proposedStage !== opts.currentStage &&
    isEarlierOrderDate(opts.orderDate, opts.latestDate);
  return stageBack || datedBack;
}
