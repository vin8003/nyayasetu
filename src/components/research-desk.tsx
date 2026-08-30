// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bookmark, Trash2 } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CiteMark } from "@/components/cite-mark";
import { AuthChip } from "@/components/auth-chip";
import { IntakeForm, type PendingFile } from "@/components/intake-form";
import { ResearchStage } from "@/components/research-stage";
import { MemoView } from "@/components/memo-view";
import { LetterView } from "@/components/letter-view";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { emptyIntake, type HistoryItem, type Intake, type LegalLetter, type LegalMemo, type LetterKind, type OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { DRAFT_KEY } from "@/lib/research/draft";
import { runResearch } from "@/lib/research/run";
import { runFollowUp } from "@/lib/research/follow-up";
import { followUpIntake } from "@/lib/research/follow-up-prompt";
import { draftLetter } from "@/lib/research/letter";
import { extractUploads } from "@/lib/research/files";
import { deleteMemoRecord, listMemos, saveMemoRecord } from "@/lib/research/store";
import { Button } from "@/components/ui/button";
import { getMatterBundle } from "@/lib/practice/store";
import { intakeFromMatter } from "@/lib/practice/intake-from-matter";

function readDraftIntake(lang) {
	if (typeof window === "undefined") return emptyIntake(lang);
	try {
		const raw = sessionStorage.getItem(DRAFT_KEY);
		if (!raw) return emptyIntake(lang);
		const parsed = JSON.parse(raw);
		if (parsed.intake) return {
			...parsed.intake,
			lang
		};
	} catch {}
	return emptyIntake(lang);
}
export function isUnauthorized(err) {
	const message = err instanceof Error ? err.message : String(err ?? "");
	return /unauthorized/i.test(message);
}
export function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const s = String(reader.result ?? "");
			const i = s.indexOf(",");
			resolve(i >= 0 ? s.slice(i + 1) : s);
		};
		reader.onerror = () => reject(reader.error ?? new Error("read failed"));
		reader.readAsDataURL(file);
	});
}
export function ResearchDesk({ lang, matterId }) {
	const navigate = useNavigate();
	const { user, isPending } = useCurrentUserState();
	const [intake, setIntake] = useState<Intake>(() => readDraftIntake(lang));
	const [files, setFiles] = useState<PendingFile[]>([]);
	const [view, setView] = useState("desk");
	const [memo, setMemo] = useState(null);
	const [letter, setLetter] = useState(null);
	const [error, setError] = useState(null);
	const [elapsed, setElapsed] = useState(0);
	const [history, setHistory] = useState([]);
	const [savedId, setSavedId] = useState(null);
	const [parentTitle, setParentTitle] = useState("");
	const [runMode, setRunMode] = useState("research");
	const [memoLang, setMemoLang] = useState(lang);
	const runSeq = useRef(0);
	const draftLock = useRef(false);
	const appliedMatter = useRef("");
	const userId = user?.id;
	const c = t(lang);
	useEffect(() => {
		setIntake((prev) => ({
			...prev,
			lang
		}));
	}, [lang]);
	useEffect(() => {
		let cancelled = false;
		async function hydrate() {
			const fromUrl = matterId || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("matter") : "") || "";
			if (fromUrl && userId && appliedMatter.current !== fromUrl) {
				try {
					const bundle = await getMatterBundle({ data: fromUrl });
					if (cancelled) return;
					if (bundle) {
						appliedMatter.current = fromUrl;
						try {
							sessionStorage.removeItem(DRAFT_KEY);
						} catch {}
						setIntake(intakeFromMatter(bundle, lang));
						return;
					}
				} catch (err) {
					if (isUnauthorized(err)) {
						navigate({ to: "/login" });
						return;
					}
				}
			}
			try {
				const raw = sessionStorage.getItem(DRAFT_KEY);
				if (!raw) return;
				sessionStorage.removeItem(DRAFT_KEY);
				const parsed = JSON.parse(raw);
				if (cancelled) return;
				if (parsed.intake) setIntake({
					...parsed.intake,
					lang
				});
			} catch {}
		}
		hydrate();
		return () => {
			cancelled = true;
		};
	}, [lang, matterId, userId, navigate]);
	useEffect(() => {
		if (!userId) {
			setHistory([]);
			return;
		}
		listMemos().then(setHistory).catch((err) => {
			if (isUnauthorized(err)) navigate({ to: "/login" });
		});
	}, [userId, navigate]);
	useEffect(() => {
		if (view !== "running" && view !== "drafting") return;
		setElapsed(0);
		const id = window.setInterval(() => setElapsed((n) => n + 1), 1000);
		return () => window.clearInterval(id);
	}, [view]);
	function requireAccount() {
		if (user) return true;
		if (isPending) return false;
		try {
			sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
				intake,
				lang
			}));
		} catch {}
		navigate({ to: "/login" });
		return false;
	}
	function bounceIfUnauthorized(err) {
		if (!isUnauthorized(err)) return false;
		navigate({ to: "/login" });
		return true;
	}
	function abandonRun() {
		runSeq.current += 1;
	}
	function cancelRun() {
		abandonRun();
		setView(view === "drafting" || runMode === "followup" ? "memo" : "desk");
		if (view !== "drafting" && runMode !== "followup") setError(null);
	}
	function mapAiError(code, forLetter = false) {
		if (code === "PAYWALL") {
			navigate({ to: "/billing" });
			return c.paywall;
		}
		if (code === "AI_UNAVAILABLE") return c.aiDown;
		if (code === "TIMEOUT") return c.timeout;
		if (code === "PARSE") return forLetter ? c.letterParseErr : c.parseErr;
		return code;
	}
	async function persist(currentIntake, currentMemo, parentId = null) {
		const item = await saveMemoRecord({ data: {
			intake: currentIntake,
			memo: currentMemo,
			parentId
		} });
		setSavedId(item.id);
		setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)]);
		return item;
	}
	async function start(nextIntake = intake) {
		if (!requireAccount()) return;
		const token = ++runSeq.current;
		let payload = nextIntake;
		setError(null);
		if (files.length > 0) {
			setIntake(payload);
			setView("running");
			try {
				const extracted = await extractUploads({ data: { files: await Promise.all(files.map(async (f) => ({
					name: f.name,
					mime: f.mime,
					base64: await fileToBase64(f.file)
				}))), facts: payload.facts } });
				if (token !== runSeq.current) return;
				if (!extracted.ok) {
					setError(mapAiError(extracted.error));
					setView("desk");
					return;
				}
				const merged = [payload.facts.trim(), extracted.combined.trim()].filter(Boolean).join("\n\n").slice(0, 20000);
				payload = {
					...payload,
					facts: merged
				};
				setIntake(payload);
			} catch (err) {
				if (token !== runSeq.current) return;
				if (bounceIfUnauthorized(err)) return;
				setError(c.fileErr);
				setView("desk");
				return;
			}
		}
		if (token !== runSeq.current) return;
		if (payload.facts.trim().length < 40) {
			setError(c.required);
			setView("desk");
			return;
		}
		setIntake(payload);
		setView("running");
		setRunMode("research");
		setSavedId(null);
		setParentTitle("");
		try {
			const result = await runResearch({ data: payload });
			if (token !== runSeq.current) return;
			if (!result.ok) {
				setError(mapAiError(result.error));
				setView("desk");
				return;
			}
			try {
				await persist(payload, result.memo);
			} catch (err) {
				if (bounceIfUnauthorized(err)) return;
			}
			if (token !== runSeq.current) return;
			setMemo(result.memo);
			setMemoLang(payload.lang);
			setLetter(null);
			setView("memo");
		} catch (err) {
			if (token !== runSeq.current) return;
			if (bounceIfUnauthorized(err)) return;
			setError(err instanceof Error ? err.message : c.parseErr);
			setView("desk");
		}
	}
	async function startFollowUp(question) {
		if (!memo) return;
		if (!requireAccount()) return;
		const q = String(question ?? "").trim();
		if (q.length < 8) {
			toast.error(c.followUpNeed);
			return;
		}
		const token = ++runSeq.current;
		setError(null);
		setRunMode("followup");
		setView("running");
		try {
			let parentId = savedId;
			if (!parentId) {
				const parent = await persist(intake, memo, null);
				parentId = parent.id;
			}
			const result = await runFollowUp({ data: {
				intake,
				memo,
				question: q
			} });
			if (token !== runSeq.current) return;
			if (!result.ok) {
				toast.error(mapAiError(result.error));
				setView("memo");
				return;
			}
			const priorTitle = memo.title;
			const nextIntake = followUpIntake(intake, q);
			try {
				await persist(nextIntake, result.memo, parentId);
			} catch (err) {
				if (bounceIfUnauthorized(err)) return;
			}
			if (token !== runSeq.current) return;
			setIntake(nextIntake);
			setMemo(result.memo);
			setMemoLang(nextIntake.lang);
			setParentTitle(priorTitle);
			setLetter(null);
			setView("memo");
		} catch (err) {
			if (token !== runSeq.current) return;
			if (bounceIfUnauthorized(err)) return;
			toast.error(err instanceof Error ? err.message : c.parseErr);
			setView("memo");
		}
	}
	async function startDraft(kind) {
		if (!memo) return;
		if (!requireAccount()) return;
		if (draftLock.current) return;
		draftLock.current = true;
		const token = ++runSeq.current;
		setError(null);
		setView("drafting");
		try {
			const result = await draftLetter({ data: {
				kind,
				intake: {
					...intake,
					lang: memoLang
				},
				memo
			} });
			if (token !== runSeq.current) return;
			if (!result.ok) {
				toast.error(mapAiError(result.error, true));
				setView("memo");
				return;
			}
			setLetter(result.letter);
			setView("letter");
		} catch (err) {
			if (token !== runSeq.current) return;
			if (bounceIfUnauthorized(err)) return;
			toast.error(err instanceof Error ? err.message : c.letterParseErr);
			setView("memo");
		} finally {
			draftLock.current = false;
		}
	}
	async function onSave() {
		if (!memo) return;
		if (!requireAccount()) return;
		if (savedId) {
			toast.success(c.saved);
			return;
		}
		try {
			await persist(intake, memo);
			toast.success(c.saved);
		} catch (err) {
			if (bounceIfUnauthorized(err)) return;
			toast.error(c.parseErr);
		}
	}
	async function onDelete(id) {
		if (!requireAccount()) return;
		try {
			await deleteMemoRecord({ data: id });
			setHistory((prev) => prev.filter((h) => h.id !== id));
			if (savedId === id) setSavedId(null);
		} catch (err) {
			bounceIfUnauthorized(err);
		}
	}
	return jsxs(Fragment, { children: [
		view === "desk" ? jsxs("div", {
			className: "stagger-in",
			children: [
				jsxs("div", {
					className: "flex flex-wrap items-end justify-between gap-3",
					children: [jsxs("div", { children: [
						jsx("p", {
							className: "text-xs font-medium uppercase tracking-[0.2em] text-accent",
							children: c.kicker
						}),
						jsx("h1", {
							className: "mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight sm:text-5xl",
							children: c.hero
						}),
						jsx("p", {
							className: "mt-3 max-w-xl text-base text-muted sm:text-lg",
							children: c.tagline
						})
					] }), jsx(Button, {
						variant: "outline",
						onClick: () => {
							if (!requireAccount()) return;
							setView("history");
						},
						children: c.history
					})]
				}),
				error ? jsx("p", {
					className: "mt-5 max-w-xl rounded-md bg-danger/10 px-3.5 py-3 text-sm text-danger",
					role: "alert",
					children: error
				}) : null,
				jsx("div", {
					className: "mt-8 sm:mt-10",
					children: jsx(IntakeForm, {
						intake,
						lang,
						busy: false,
						error: null,
						files,
						onChange: setIntake,
						onSubmit: () => start(),
						onSample: (sample) => {
							setIntake({
								...sample,
								lang
							});
							setFiles([]);
							setError(null);
						},
						onFiles: setFiles
					})
				}),
				jsx("p", {
					className: "mt-10 max-w-2xl text-xs leading-relaxed text-subtle",
					children: c.disclaimer
				})
			]
		}) : null,
		view === "running" ? jsx(ResearchStage, {
			lang,
			elapsed,
			onCancel: cancelRun,
			mode: runMode === "followup" ? "followup" : "research"
		}) : null,
		view === "drafting" ? jsx(ResearchStage, {
			lang,
			elapsed,
			onCancel: cancelRun,
			mode: "letter"
		}) : null,
		view === "memo" && memo ? jsx(MemoView, {
			lang,
			memo,
			saved: Boolean(savedId),
			parentTitle: parentTitle || null,
			onBack: () => {
				setView("desk");
				setError(null);
			},
			onSave: () => void onSave(),
			onDraft: (kind) => void startDraft(kind),
			onFollowUp: (question) => void startFollowUp(question)
		}) : null,
		view === "letter" && letter ? jsx(LetterView, {
			lang,
			letter,
			onBack: () => {
				setView("memo");
				setError(null);
			}
		}) : null,
		view === "history" ? jsxs("section", { children: [jsxs("div", {
			className: "mb-6 flex items-center justify-between",
			children: [jsx("h1", {
				className: "font-display text-3xl",
				children: c.history
			}), jsx(Button, {
				variant: "outline",
				onClick: () => setView("desk"),
				children: c.newBrief
			})]
		}), history.length === 0 ? jsx("p", {
			className: "text-sm text-muted",
			children: c.emptyHistory
		}) : jsx("ul", {
			className: "space-y-2",
			children: history.map((item) => jsxs("li", {
				className: "flex items-stretch rounded-lg bg-surface shadow-[0_0_0_1px_rgb(255_255_255/0.08)]",
				children: [jsxs("button", {
					type: "button",
					onClick: () => {
						setIntake(item.intake);
						setMemo(item.memo);
						setMemoLang(item.intake.lang);
						setLetter(null);
						setSavedId(item.id);
						setParentTitle(item.parentId ? (history.find((h) => h.id === item.parentId)?.title ?? c.followUp) : "");
						setView("memo");
					},
					className: "min-w-0 flex-1 px-4 py-3 text-left",
					children: [jsx("div", {
						className: "truncate font-medium",
						children: item.title
					}), jsxs("div", {
						className: "mt-1 text-xs text-muted",
						children: [
							new Date(item.createdAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN"),
							item.parentId ? ` · ${c.followUp}` : ""
						]
					})]
				}), jsx("button", {
					type: "button",
					className: "inline-flex size-11 shrink-0 items-center justify-center text-muted hover:text-danger",
					"aria-label": c.deleteMemo,
					onClick: () => void onDelete(item.id),
					children: jsx(Trash2, { className: "size-4" })
				})]
			}, item.id))
		})] }) : null
	] });
}
