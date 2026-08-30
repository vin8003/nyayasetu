// @ts-nocheck
import { jsx, jsxs } from "react/jsx-runtime";
import { Badge } from "@/components/ui/badge";
import { p } from "@/lib/practice/copy";
import type { ProceedingId } from "@/lib/practice/types";
import type { OutputLang } from "@/lib/research/types";
import { possibleNext, stageDef } from "@/lib/practice/workflow";

export function StagePanel({ lang, proceeding, stage }: { lang: OutputLang; proceeding: ProceedingId | string; stage: string }) {
	const c = p(lang);
	const def = stageDef(proceeding, stage);
	if (!def) return null;
	const next = possibleNext(proceeding, stage);
	const label = lang === "hi" ? def.labelHi : def.label;
	return jsxs("aside", {
		className: "rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
		children: [
			jsx("p", {
				className: "text-xs font-medium uppercase tracking-[0.16em] text-accent",
				children: c.stage
			}),
			jsx("h2", {
				className: "mt-2 font-display text-2xl tracking-tight",
				children: label
			}),
			jsx("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: def.what
			}),
			jsx("p", {
				className: "mt-4 text-xs font-medium text-subtle",
				children: c.lawyerDoes
			}),
			jsx("p", {
				className: "mt-1 text-sm leading-relaxed text-fg/90",
				children: def.lawyer
			}),
			jsx("p", {
				className: "mt-4 text-xs font-medium text-subtle",
				children: c.courtDoes
			}),
			jsx("p", {
				className: "mt-1 text-sm leading-relaxed text-muted",
				children: def.court
			}),
			def.docs.length > 0 ? jsxs("div", {
				className: "mt-4",
				children: [jsx("p", {
					className: "text-xs font-medium text-subtle",
					children: c.typicalDocs
				}), jsx("div", {
					className: "mt-2 flex flex-wrap gap-1.5",
					children: def.docs.map((d) => jsx(Badge, { children: d }, d))
				})]
			}) : null,
			def.deadlines.length > 0 ? jsxs("div", {
				className: "mt-4",
				children: [jsx("p", {
					className: "text-xs font-medium text-subtle",
					children: c.typicalDeadlines
				}), jsx("ul", {
					className: "mt-2 space-y-1 text-sm text-muted",
					children: def.deadlines.map((d) => jsx("li", { children: d }, d))
				})]
			}) : null,
			next.length > 0 ? jsxs("div", {
				className: "mt-4",
				children: [jsx("p", {
					className: "text-xs font-medium text-subtle",
					children: c.possibleNext
				}), jsx("ul", {
					className: "mt-2 space-y-1.5 text-sm",
					children: next.map((n) => jsxs("li", { children: [
						jsx("span", {
							className: "text-fg",
							children: n.label
						}),
						n.when ? jsxs("span", {
							className: "text-muted",
							children: [" — ", n.when]
						}) : null,
						n.kind === "branch" ? jsx(Badge, {
							className: "ml-2",
							tone: "warn",
							children: lang === "hi" ? "शाखा" : "branch"
						}) : null
					] }, `${n.kind}-${n.id}-${n.when ?? ""}`))
				})]
			}) : null,
			jsxs("div", {
				className: "mt-5 grid gap-3 sm:grid-cols-2",
				children: [jsxs("div", { children: [jsx("p", {
					className: "text-xs font-medium text-subtle",
					children: c.aiCan
				}), jsx("ul", {
					className: "mt-1 space-y-1 text-sm text-muted",
					children: def.ai.map((x) => jsx("li", { children: x }, x))
				})] }), jsxs("div", { children: [jsx("p", {
					className: "text-xs font-medium text-subtle",
					children: c.humanGate
				}), jsx("ul", {
					className: "mt-1 space-y-1 text-sm text-muted",
					children: def.human.map((x) => jsx("li", { children: x }, x))
				})] })]
			}),
			jsx("p", {
				className: "mt-5 text-xs leading-relaxed text-subtle",
				children: c.modelNote
			})
		]
	});
}
