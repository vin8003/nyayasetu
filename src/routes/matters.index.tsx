// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { jsx, jsxs } from "react/jsx-runtime";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { p } from "@/lib/practice/copy";
import { defaultStage, proceedingDef, stageDef } from "@/lib/practice/workflow";
import { clearSampleChamber, listMatters, saveMatter, seedSampleChamber } from "@/lib/practice/store";
import { isSampleTitle } from "@/lib/practice/sample";
import { PROCEEDINGS, OUR_SIDES, type Matter } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import { intakeFromMatter } from "@/lib/practice/intake-from-matter";
import { DRAFT_KEY } from "@/lib/research/draft";

export const Route = createFileRoute("/matters/")({ component: MattersIndexPage });

export function emptyDraft() {
	return {
		title: "",
		clientName: "",
		proceeding: "civil",
		stage: defaultStage("civil"),
		courtName: "",
		caseNumber: "",
		cnr: "",
		caseType: "",
		jurisdiction: "",
		ourSide: "petitioner",
		partiesText: "",
		notes: ""
	};
}
export function MattersIndexPage() {
	const { lang, onLang } = useChamberLang();
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const [matters, setMatters] = useState([]);
	const [draft, setDraft] = useState(emptyDraft);
	const [open, setOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [confirmExit, setConfirmExit] = useState(false);
	const c = p(lang);
	const proc = proceedingDef(draft.proceeding);
	useEffect(() => {
		if (!user) return;
		listMatters().then(setMatters).catch((err) => {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
		});
	}, [user, navigate]);
	async function onSubmit(e) {
		e.preventDefault();
		if (!draft.title.trim()) {
			toast.error(c.requiredTitle);
			return;
		}
		setBusy(true);
		try {
			const { id } = await saveMatter({ data: draft });
			toast.success(c.saveMatter);
			navigate({
				to: "/matters/$id",
				params: { id }
			});
		} catch (err) {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
		} finally {
			setBusy(false);
		}
	}
	async function exitSample() {
		setBusy(true);
		try {
			await clearSampleChamber();
			setMatters(await listMatters());
			setConfirmExit(false);
			toast.success(c.clearedSample);
		} catch (err) {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
			else toast.error(c.sampleErr);
		} finally {
			setBusy(false);
		}
	}
	async function loadSample() {
		setBusy(true);
		try {
			const result = await seedSampleChamber();
			setMatters(await listMatters());
			toast.success(result?.replaced ? c.reloadedSample : c.sampleLoaded);
		} catch (err) {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
			else toast.error(c.sampleErr);
		} finally {
			setBusy(false);
		}
	}
	const sampleOn = matters.some((m) => isSampleTitle(m.title));
	return jsxs(AppShell, {
		lang,
		onLang,
		active: "matters",
		children: [
			isPending ? jsx("div", { className: "h-40 animate-pulse rounded-xl bg-elevated" }) : null,
			!isPending && !user ? jsx(GuestPanel, { lang }) : null,
			!isPending && user ? jsxs("div", { children: [
				jsxs("div", {
					className: "flex flex-wrap items-end justify-between gap-3",
					children: [jsxs("div", { children: [jsx("h1", {
						className: "font-display text-4xl tracking-tight",
						children: c.matters
					}), jsx("p", {
						className: "mt-2 text-muted",
						children: c.modelNote
					})] }), jsx(Button, {
						onClick: () => setOpen((v) => !v),
						children: c.newMatter
					})]
				}),
				sampleOn ? jsxs("div", {
					className: "mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
					children: [
						jsxs("div", {
							children: [
								jsx("div", { className: "text-sm font-medium", children: c.sampleBanner }),
								jsx("p", {
									className: "mt-1 text-xs text-muted",
									children: confirmExit ? c.clearSampleConfirm : c.clearSampleHint
								})
							]
						}),
						jsxs("div", {
							className: "flex flex-wrap gap-2",
							children: confirmExit ? [
								jsx(Button, {
									type: "button",
									variant: "outline",
									disabled: busy,
									onClick: () => setConfirmExit(false),
									children: c.clearSampleNo
								}, "keep"),
								jsx(Button, {
									type: "button",
									variant: "danger",
									disabled: busy,
									onClick: () => void exitSample(),
									children: c.clearSampleYes
								}, "remove")
							] : jsx(Button, {
								type: "button",
								variant: "outline",
								disabled: busy,
								onClick: () => setConfirmExit(true),
								children: c.clearSample
							})
						})
					]
				}) : jsxs("div", {
					className: "mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
					children: [
						jsxs("div", {
							children: [
								jsx("div", { className: "text-sm font-medium", children: c.loadSample }),
								jsx("p", { className: "mt-1 text-xs text-muted", children: c.sampleHint })
							]
						}),
						jsx(Button, {
							type: "button",
							disabled: busy,
							onClick: () => void loadSample(),
							children: c.loadSample
						})
					]
				}),
				open ? jsxs("form", {
					onSubmit,
					className: "mt-8 grid gap-4 rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
					children: [
						jsxs(Field, { children: [jsx(Label, {
							htmlFor: "title",
							children: c.untitled === "Untitled" ? "Title" : "शीर्षक"
						}), jsx(Input, {
							id: "title",
							value: draft.title,
							onChange: (e) => setDraft({
								...draft,
								title: e.target.value
							}),
							required: true
						})] }),
						jsxs("div", {
							className: "grid gap-4 sm:grid-cols-2",
							children: [jsxs(Field, { children: [jsx(Label, {
								htmlFor: "client",
								children: c.client
							}), jsx(Input, {
								id: "client",
								value: draft.clientName,
								onChange: (e) => setDraft({
									...draft,
									clientName: e.target.value
								})
							})] }), jsxs(Field, { children: [jsx(Label, {
								htmlFor: "court",
								children: c.courtName
							}), jsx(Input, {
								id: "court",
								value: draft.courtName,
								onChange: (e) => setDraft({
									...draft,
									courtName: e.target.value
								})
							})] })]
						}),
						jsxs("div", {
							className: "grid gap-4 sm:grid-cols-2",
							children: [jsxs(Field, { children: [jsx(Label, {
								htmlFor: "proc",
								children: c.proceeding
							}), jsx(Select, {
								id: "proc",
								value: draft.proceeding,
								onChange: (e) => {
									const proceeding = e.target.value;
									setDraft({
										...draft,
										proceeding,
										stage: defaultStage(proceeding)
									});
								},
								children: PROCEEDINGS.map((id) => {
									const d = proceedingDef(id);
									return jsx("option", {
										value: id,
										children: lang === "hi" ? d.labelHi : d.label
									}, id);
								})
							})] }), jsxs(Field, { children: [jsx(Label, {
								htmlFor: "stage",
								children: c.stage
							}), jsx(Select, {
								id: "stage",
								value: draft.stage,
								onChange: (e) => setDraft({
									...draft,
									stage: e.target.value
								}),
								children: proc.stages.map((s) => jsx("option", {
									value: s.id,
									children: lang === "hi" ? s.labelHi : s.label
								}, s.id))
							})] })]
						}),
						jsxs("div", {
							className: "grid gap-4 sm:grid-cols-3",
							children: [
								jsxs(Field, { children: [jsx(Label, {
									htmlFor: "cno",
									children: c.caseNo
								}), jsx(Input, {
									id: "cno",
									value: draft.caseNumber,
									onChange: (e) => setDraft({
										...draft,
										caseNumber: e.target.value
									})
								})] }),
								jsxs(Field, { children: [jsx(Label, {
									htmlFor: "cnr",
									children: c.cnr
								}), jsx(Input, {
									id: "cnr",
									value: draft.cnr,
									onChange: (e) => setDraft({
										...draft,
										cnr: e.target.value
									})
								})] }),
								jsxs(Field, { children: [jsx(Label, {
									htmlFor: "side",
									children: c.ourSide
								}), jsx(Select, {
									id: "side",
									value: draft.ourSide,
									onChange: (e) => setDraft({
										...draft,
										ourSide: e.target.value
									}),
									children: OUR_SIDES.map((s) => jsx("option", {
										value: s,
										children: s
									}, s))
								})] })
							]
						}),
						jsxs(Field, { children: [
							jsx(Label, {
								htmlFor: "parties",
								children: c.parties
							}),
							jsx(Textarea, {
								id: "parties",
								className: "min-h-24",
								value: draft.partiesText,
								onChange: (e) => setDraft({
									...draft,
									partiesText: e.target.value
								})
							}),
							jsx(Hint, { children: c.partiesHint })
						] }),
						jsxs(Field, { children: [jsx(Label, {
							htmlFor: "notes",
							children: c.notes
						}), jsx(Textarea, {
							id: "notes",
							className: "min-h-24",
							value: draft.notes,
							onChange: (e) => setDraft({
								...draft,
								notes: e.target.value
							})
						})] }),
						jsxs("div", {
							className: "flex gap-2",
							children: [jsx(Button, {
								type: "submit",
								disabled: busy,
								children: c.saveMatter
							}), jsx(Button, {
								type: "button",
								variant: "ghost",
								onClick: () => setOpen(false),
								children: c.cancel
							})]
						})
					]
				}) : null,
				matters.length === 0 && !open ? jsx("p", {
					className: "mt-8 text-sm text-muted",
					children: c.emptyMatters
				}) : null,
				jsx("ul", {
					className: "mt-8 space-y-2",
					children: matters.map((m) => {
						const st = stageDef(m.proceeding, m.stage);
						return jsxs("li", {
							className: "flex items-stretch gap-2",
							children: [jsxs(Link, {
							to: "/matters/$id",
							params: { id: m.id },
							className: "block min-w-0 flex-1 rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.14)]",
							children: [jsx("div", {
								className: "font-medium",
								children: m.title
							}), jsxs("div", {
								className: "mt-1 text-xs text-muted",
								children: [
									m.courtName || m.caseNumber,
									" · ",
									st ? lang === "hi" ? st.labelHi : st.label : m.stage,
									m.nextHearingOn ? ` · ${m.nextHearingOn}` : ""
								]
							})]
						}), jsx(Button, {
							asChild: true,
							variant: "ghost",
							size: "sm",
							className: "self-center",
							children: jsx(Link, {
								to: "/research",
								search: { matter: m.id },
								onClick: () => {
									try {
										sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
											intake: intakeFromMatter({ matter: m }, lang),
											lang
										}));
									} catch {}
								},
								children: c.research
							})
						})]
						}, m.id);
					})
				})
			] }) : null
		]
	});
}
