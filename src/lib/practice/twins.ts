import type { Deadline, Task } from "./types";

/*
 * Confirming an order with a dated direction writes it twice: once as a task and
 * once as a deadline. Lists show the deadline only, and marking either done
 * closes both, so the two never drift apart.
 */

function key(item: { matterId: string | null; title: string }) {
  return `${item.matterId ?? ""}::${item.title.trim().toLowerCase()}`;
}

/** Open tasks that are not already shown as an open deadline. */
export function tasksWithoutTwins<T extends Task>(tasks: T[], deadlines: Deadline[]): T[] {
  const dated = new Set(deadlines.filter((d) => d.status === "open").map(key));
  return tasks.filter((t) => !(t.status === "open" && dated.has(key(t))));
}

/** Every id that should change together with `id` (itself included). */
export function twinIds(id: string, tasks: Task[], deadlines: Deadline[]): string[] {
  const all = [...tasks, ...deadlines];
  const self = all.find((row) => row.id === id);
  if (!self) return [id];
  const k = key(self);
  return [...new Set([id, ...all.filter((row) => key(row) === k).map((row) => row.id)])];
}
