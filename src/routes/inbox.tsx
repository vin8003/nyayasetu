// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { jsx, jsxs } from "react/jsx-runtime";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { Field, Hint, Label, Select, Textarea } from "@/components/ui/field";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { p } from "@/lib/practice/copy";
import { extractOrder } from "@/lib/practice/extract-order";
import { readInboxDraft } from "@/lib/practice/inbox-draft";
import { addHearing, addTask, confirmOrder, discardOrder, listMatters, listUnconfirmedOrders, savePastedDocument, saveUnconfirmedOrder } from "@/lib/practice/store";
import type { Matter, MatterOrder, OrderExtract } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import { extractUploads } from "@/lib/research/files";
import { fileToBase64 } from "@/lib/read-file";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { isSampleMatter } from "@/lib/practice/sample-ids";

export const Route = createFileRoute("/inbox")({
	validateSearch: (search: Record<string, unknown>): { matter?: string } => ({
		matter: typeof search.matter === "string" && search.matter.length > 0 ? search.matter : undefined,
	}),
	component: InboxPage,
});

export function InboxPage() {
	const { lang, onLang } = useChamberLang();
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const { matter: matterFromUrl } = Route.useSearch();
	const c = p(lang);
	const [matters, setMatters] = useState([]);
	const [matterId, setMatterId] = useState("");
	const [body, setBody] = useState("");
	const [busy, setBusy] = useState(false);
	const [extract, setExtract] = useState(null);
	const [pendingId, setPendingId] = useState(null);
	const [applyStage, setApplyStage] = useState(true);
	const [includeSuggestions, setIncludeSuggestions] = useState(true);
	const [queue, setQueue] = useState([]);
	async function reloadQueue() {
		const rows = await listUnconfirmedOrders();
		setQueue(rows);
	}
	useEffect(() => {
		if (!user) return;
		const draft = readInboxDraft();
		if (draft) {
			setMatterId(draft.matterId);
			setBody(draft.body);
		} else if (matterFromUrl) setMatterId(matterFromUrl);
		listMatters().then((rows) => {
			setMatters(rows);
			setMatterId((current) => current || draft?.matterId || matterFromUrl || rows[0]?.id || "");
		}).catch((err) => {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
		});
		reloadQueue().catch(() => undefined);
	}, [user, navigate, matterFromUrl]);
	async function onInboxFiles(list) {
		const files = [...(list ?? [])].slice(0, 3);
		if (!files.length) return;
		setBusy(true);
		try {
			const extracted = await extractUploads({
				data: {
					files: await Promise.all(files.map(async (f) => ({
						name: f.name,
						mime: f.type,
						base64: await fileToBase64(f)
					})))
				}
			});
			if (!extracted.ok) {
				if (extracted.error === "PAYWALL") {
					toast.error(c.paywall);
					navigate({ to: "/billing" });
					return;
				}
				toast.error(c.failedAi);
				return;
			}
			const text = String(extracted.combined || "").trim();
			if (text.length < 20) {
				toast.error(c.parseErr);
				return;
			}
			setBody(text);
		} catch (err) {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
			else toast.error(c.parseErr);
		} finally {
			setBusy(false);
		}
	}
	const matter = matters.find((m) => m.id === matterId);
	async function onAnalyse(e) {
		e.preventDefault();
		if (!matter) {
			toast.error(c.noMatter);
			return;
		}
		setBusy(true);
		setExtract(null);
		try {
			const result = await extractOrder({ data: {
				matterTitle: matter.title,
				proceeding: matter.proceeding,
				stage: matter.stage,
				orderText: body
			} });
			if (!result.ok) {
				if (result.error === "PAYWALL") {
					toast.error(c.paywall);
					navigate({ to: "/billing" });
					return;
				}
				toast.error(result.error === "PARSE" ? c.parseErr : c.failedAi);
				return;
			}
			const doc = await savePastedDocument({ data: {
				matterId: matter.id,
				title: "Pasted order",
				body,
				kind: "order"
			} });
			const saved = await saveUnconfirmedOrder({ data: {
				matterId: matter.id,
				body,
				directions: result.extract.directions,
				documentId: doc.id
			} });
			setPendingId(saved.id);
			setExtract(result.extract);
			await reloadQueue();
		} catch (err) {
			if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
			else toast.error(c.parseErr);
		} finally {
			setBusy(false);
		}
	}
	async function onConfirm() {
		if (!pendingId || !extract || !matter) return;
		setBusy(true);
		try {
			await confirmOrder({ data: {
				orderId: pendingId,
				applyStage: applyStage ? extract.stageHint : null
			} });
			if (extract.nextHearing?.date) await addHearing({ data: {
				matterId: matter.id,
				listedOn: extract.nextHearing.date,
				purpose: extract.nextHearing.purpose
			} });
			if (includeSuggestions) for (const t of extract.suggestedTasks) await addTask({ data: {
				matterId: matter.id,
				title: t.title,
				origin: "ai_suggestion"
			} });
			toast.success(c.confirm);
			setExtract(null);
			setPendingId(null);
			setBody("");
			await reloadQueue();
			navigate({
				to: "/matters/$id",
				params: { id: matter.id }
			});
		} finally {
			setBusy(false);
		}
	}
	async function onDiscard() {
		if (pendingId) await discardOrder({ data: pendingId });
		setExtract(null);
		setPendingId(null);
		await reloadQueue();
	}
	function openPending(row) {
		setPendingId(row.id);
		setMatterId(row.matterId);
		setBody(row.body || "");
		setExtract({
			summary: String(row.body || "").slice(0, 500),
			nextHearing: null,
			directions: row.directions ?? [],
			suggestedTasks: [],
			stageHint: null,
			caveats: []
		});
	}
	return jsxs(AppShell, {
		lang,
		onLang,
		active: "inbox",
		children: [
			isPending ? jsx("div", { className: "skeleton h-40" }) : null,
			!isPending && !user ? jsx(GuestPanel, { lang }) : null,
			!isPending && user ? jsxs("div", { children: [
				jsx("h1", {
					className: "page-title",
					children: c.inbox
				}),
				jsx("p", {
					className: "page-lead",
					children: c.inboxHint
				}),
				jsx("p", {
					className: "mt-2 max-w-xl text-xs text-subtle",
					children: c.trustNote
				}),
				matters.length > 0 ? jsx("div", {
					className: "mt-6 max-w-xl",
					children: jsx(EciCnrFetch, {
						lang,
						matterId,
						defaultCnr: matter?.cnr || "",
						sample: isSampleMatter({ title: matter?.title, caseNumber: matter?.caseNumber }),
						onLanded: async (landed) => {
							if (landed.matterId && landed.matterId !== matterId) setMatterId(landed.matterId);
							await reloadQueue();
							const first = landed.pending?.[0];
							if (first) openPending({
								id: first.id,
								matterId: landed.matterId,
								body: first.body,
								directions: first.directions
							});
						}
					})
				}) : null,
				matters.length === 0 ? jsxs("p", {
					className: "section-note stack-tight",
					children: [
						c.noMatter,
						" ",
						jsx(Link, {
							to: "/matters",
							className: "text-accent",
							children: c.newMatter
						})
					]
				}) : jsxs("form", {
					onSubmit: onAnalyse,
					className: "mt-8 space-y-4",
					children: [
						jsxs(Field, { children: [jsx(Label, {
							htmlFor: "m",
							children: c.matters
						}), jsx(Select, {
							id: "m",
							value: matterId,
							onChange: (e) => setMatterId(e.target.value),
							children: matters.map((m) => jsx("option", {
								value: m.id,
								children: m.title
							}, m.id))
						})] }),
						jsxs(Field, { children: [
							jsx(Label, {
								htmlFor: "order",
								children: c.pasteOrder
							}),
							jsx(Textarea, {
								id: "order",
								className: "min-h-52",
								value: body,
								onChange: (e) => setBody(e.target.value),
								required: true
							}),
							jsx(Hint, { children: c.inboxHint })
						] }),
						jsxs("label", {
							className: "inline-flex h-10 cursor-pointer items-center text-sm text-accent hover:underline",
							children: [c.uploadPaper, jsx("input", {
								type: "file",
								className: "sr-only",
								accept: ".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*",
								multiple: true,
								onChange: (e) => {
									void onInboxFiles(e.target.files);
									e.target.value = "";
								}
							})]
						}),
						jsx(Button, {
							type: "submit",
							disabled: busy,
							children: busy ? c.analysing : c.analyseOrder
						})
					]
				}),
				extract ? jsxs("section", {
					className: "mt-10 space-y-4 card card-pad",
					children: [
						jsx("h2", {
							className: "section-title",
							children: c.extractSummary
						}),
						jsx("p", {
							className: "text-sm leading-relaxed text-muted",
							children: extract.summary
						}),
						extract.nextHearing ? jsxs("p", {
							className: "text-sm",
							children: [
								c.nextHearing,
								": ",
								extract.nextHearing.date,
								" — ",
								extract.nextHearing.purpose
							]
						}) : null,
						jsxs("div", { children: [jsx("h3", {
							className: "text-sm font-medium",
							children: c.extractedDirections
						}), jsx("ul", {
							className: "mt-2 space-y-2",
							children: extract.directions.map((d, i) => jsxs("li", {
								className: "rounded-md bg-elevated px-3 py-2 text-sm",
								children: [
									jsx(TrustChip, {
										origin: "court_direction",
										lang
									}),
									jsx("div", {
										className: "mt-1",
										children: d.text
									}),
									jsxs("div", {
										className: "row-meta",
										children: [
											d.party,
											" ",
											d.deadline ?? ""
										]
									})
								]
							}, `${d.text}-${i}`))
						})] }),
						extract.suggestedTasks.length > 0 ? jsxs("div", { children: [jsx("h3", {
							className: "text-sm font-medium",
							children: c.suggestedTasks
						}), jsx("ul", {
							className: "mt-2 space-y-2",
							children: extract.suggestedTasks.map((t, i) => jsxs("li", {
								className: "rounded-md bg-elevated px-3 py-2 text-sm",
								children: [
									jsx(TrustChip, {
										origin: "ai_suggestion",
										lang
									}),
									jsx("div", {
										className: "mt-1",
										children: t.title
									}),
									jsx("div", {
										className: "row-meta",
										children: t.reason
									})
								]
							}, `${t.title}-${i}`))
						})] }) : null,
						extract.caveats.length > 0 ? jsxs("p", {
							className: "text-xs text-warn",
							children: [
								c.caveats,
								": ",
								extract.caveats.join(" · ")
							]
						}) : null,
						jsxs("label", {
							className: "flex items-center gap-2 text-sm",
							children: [
								jsx("input", {
									type: "checkbox",
									checked: applyStage,
									onChange: (e) => setApplyStage(e.target.checked)
								}),
								c.confirmStage,
								extract.stageHint ? ` (${extract.stageHint})` : ""
							]
						}),
						jsxs("label", {
							className: "flex items-center gap-2 text-sm",
							children: [jsx("input", {
								type: "checkbox",
								checked: includeSuggestions,
								onChange: (e) => setIncludeSuggestions(e.target.checked)
							}), c.suggestedTasks]
						}),
						jsxs("div", {
							className: "flex flex-wrap gap-2",
							children: [jsx(Button, {
								onClick: () => void onConfirm(),
								disabled: busy,
								children: c.confirm
							}), jsx(Button, {
								variant: "ghost",
								onClick: () => void onDiscard(),
								children: c.reject
							})]
						})
					]
				}) : null,
				queue.length > 0 && !extract ? jsxs("section", {
					className: "mt-8",
					children: [jsxs("p", {
						className: "text-sm text-muted",
						children: [
							c.ordersAction,
							": ",
							queue.length
						]
					}), jsx("ul", {
						className: "row-list",
						children: queue.map((q) => jsx("li", { children: jsx("button", {
							type: "button",
							className: "row w-full text-left",
							onClick: () => openPending(q),
							children: q.matterTitle || c.orders
						}) }, q.id))
					})]
				}) : null
			] }) : null
		]
	});
}
