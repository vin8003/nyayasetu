import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { IntakeForm, type PendingFile } from "@/components/intake-form";
import { ResearchStage } from "@/components/research-stage";
import { MemoView } from "@/components/memo-view";
import { LetterView } from "@/components/letter-view";
import { MemoHistory } from "@/components/memo-history";
import { refreshCounts, type NewMatterPrefill } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { emptyIntake, type HistoryItem, type Intake, type LegalLetter, type LegalMemo, type LetterKind, type OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { DRAFT_KEY } from "@/lib/research/draft";
import { runResearch } from "@/lib/research/run";
import { draftLetter } from "@/lib/research/letter";
import { extractUploads } from "@/lib/research/files";
import { deleteMemoRecord, getMemoRecord, listMemos, saveMemoRecord } from "@/lib/research/store";
import { attachDraftToMatter, getMatterBundle, listMatters } from "@/lib/practice/store";
import { intakeFromMatter } from "@/lib/practice/intake-from-matter";
import { formatLegalLetter } from "@/lib/research/letter-format";
import { fileToBase64 } from "@/lib/read-file";

type View = "desk" | "running" | "drafting" | "memo" | "letter";
type Draft = { intake?: Intake; lang?: OutputLang; autostart?: boolean };

const PROCEEDING_BY_AREA: Record<string, string> = {
  criminal: "criminal",
  writ: "writ",
  constitutional: "writ",
  service: "writ",
  family: "family",
  consumer: "consumer",
  arbitration: "arbitration",
  company: "commercial",
  ipr: "commercial",
};

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(DRAFT_KEY);
    return JSON.parse(raw) as Draft;
  } catch {
    return null;
  }
}

export function isUnauthorized(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /unauthorized/i.test(message);
}

export function ResearchDesk({
  lang,
  matterId,
  memoId,
  history: showHistory = false,
  children,
}: {
  lang: OutputLang;
  matterId?: string;
  memoId?: string;
  history?: boolean;
  /** The Research / Ask / Past memos tabs, shown above the desk and history. */
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [intake, setIntake] = useState<Intake>(() => emptyIntake(lang));
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [view, setView] = useState<View>(memoId ? "memo" : "desk");
  const [memo, setMemo] = useState<LegalMemo | null>(null);
  const [letter, setLetter] = useState<LegalLetter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [parentTitle, setParentTitle] = useState("");
  const [letterOnFile, setLetterOnFile] = useState(false);
  const [memoLang, setMemoLang] = useState<OutputLang>(lang);
  const [matter, setMatter] = useState<{ id: string; title: string } | null>(null);
  const [matterTitles, setMatterTitles] = useState<Record<string, string>>({});
  const runSeq = useRef(0);
  const draftLock = useRef(false);
  const applied = useRef("");
  const userId = user?.id;
  const c = t(lang);

  useEffect(() => {
    setIntake((prev) => ({ ...prev, lang }));
  }, [lang]);

  // What the URL asks for: a saved memo, research on a matter, or a hand-off from elsewhere.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function hydrate() {
      if (memoId) {
        if (applied.current === `memo:${memoId}`) return;
        setMemo(null);
        setLetter(null);
        setView("memo");
        try {
          const item = await getMemoRecord({ data: memoId });
          if (cancelled || !item) return;
          applied.current = `memo:${memoId}`;
          setIntake({ ...item.intake });
          setMemo(item.memo);
          setSavedId(item.id);
          setMemoLang(item.intake.lang || lang);
          setLetter(null);
          setLetterOnFile(false);
          setParentTitle("");
          setView("memo");
          if (item.matterId) {
            const bundle = await getMatterBundle({ data: item.matterId }).catch(() => null);
            if (!cancelled) setMatter(bundle ? { id: bundle.matter.id, title: bundle.matter.title } : null);
          } else {
            setMatter(null);
          }
        } catch (err) {
          if (isUnauthorized(err)) navigate({ to: "/login" });
        }
        return;
      }
      if (matterId) {
        if (applied.current === `matter:${matterId}`) return;
        try {
          const bundle = await getMatterBundle({ data: matterId });
          if (cancelled || !bundle) return;
          applied.current = `matter:${matterId}`;
          readDraft();
          setMatter({ id: bundle.matter.id, title: bundle.matter.title });
          setIntake(intakeFromMatter(bundle, lang));
          setView("desk");
        } catch (err) {
          if (isUnauthorized(err)) navigate({ to: "/login" });
        }
        return;
      }
      applied.current = "";
      setMatter(null);
      const draft = readDraft();
      if (cancelled || !draft?.intake) return;
      const next = { ...draft.intake, lang: draft.intake.lang || lang };
      setIntake(next);
      setView("desk");
      if (draft.autostart && next.facts.trim().length >= 40) void start(next);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [memoId, matterId, userId]);

  // Leaving a memo by its URL (the New memo tab, browser back) returns to a clean desk.
  useEffect(() => {
    if (memoId || (view !== "memo" && view !== "letter")) return;
    applied.current = "";
    setMemo(null);
    setLetter(null);
    setSavedId(null);
    setView("desk");
  }, [memoId]);

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      return;
    }
    const q = historyQuery.trim();
    const delay = showHistory && q.length >= 2 ? 250 : 0;
    const handle = window.setTimeout(() => {
      listMemos({ data: { q: showHistory ? q : "" } })
        .then(setHistory)
        .catch((err) => {
          if (isUnauthorized(err)) navigate({ to: "/login" });
        });
    }, delay);
    return () => window.clearTimeout(handle);
  }, [userId, historyQuery, showHistory]);

  useEffect(() => {
    if (!showHistory || !userId) return;
    listMatters()
      .then((rows) => setMatterTitles(Object.fromEntries((rows as { id: string; title: string }[]).map((m) => [m.id, m.title]))))
      .catch(() => undefined);
  }, [showHistory, userId]);

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
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ intake, lang }));
    } catch {
      /* private mode */
    }
    navigate({ to: "/login" });
    return false;
  }

  function bounceIfUnauthorized(err: unknown) {
    if (!isUnauthorized(err)) return false;
    navigate({ to: "/login" });
    return true;
  }

  function cancelRun() {
    runSeq.current += 1;
    setView(view === "drafting" ? "memo" : "desk");
    if (view !== "drafting") setError(null);
  }

  function mapAiError(code: string, forLetter = false) {
    if (code === "PAYWALL") {
      navigate({ to: "/billing" });
      return c.paywall;
    }
    if (code === "AI_UNAVAILABLE") return c.aiDown;
    if (code === "TIMEOUT") return c.timeout;
    if (code === "PARSE") return forLetter ? c.letterParseErr : c.parseErr;
    return code;
  }

  async function persist(currentIntake: Intake, currentMemo: LegalMemo, parentId: string | null = null) {
    const item = await saveMemoRecord({
      data: { intake: currentIntake, memo: currentMemo, parentId, matterId: matter?.id ?? matterId ?? null },
    });
    setSavedId(item.id);
    setHistory((prev) => [item, ...prev.filter((h) => h.id !== item.id)]);
    return item;
  }

  async function start(nextIntake: Intake = intake) {
    if (!requireAccount()) return;
    const token = ++runSeq.current;
    let payload = nextIntake;
    setError(null);
    if (files.length > 0) {
      setIntake(payload);
      setView("running");
      try {
        const extracted = await extractUploads({
          data: {
            files: await Promise.all(files.map(async (f) => ({ name: f.name, mime: f.mime, base64: await fileToBase64(f.file) }))),
            facts: payload.facts,
          },
        });
        if (token !== runSeq.current) return;
        if (!extracted.ok) {
          setError(mapAiError(extracted.error));
          setView("desk");
          return;
        }
        const merged = [payload.facts.trim(), extracted.combined.trim()].filter(Boolean).join("\n\n").slice(0, 20000);
        payload = { ...payload, facts: merged };
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
      let saved: HistoryItem | null = null;
      try {
        saved = await persist(payload, result.memo);
      } catch (err) {
        if (bounceIfUnauthorized(err)) return;
      }
      if (token !== runSeq.current) return;
      setMemo(result.memo);
      setMemoLang(payload.lang);
      setLetter(null);
      setFiles([]);
      setView("memo");
      if (saved) {
        applied.current = `memo:${saved.id}`;
        navigate({ to: "/research", search: { memo: saved.id, matter: matter?.id ?? matterId, view: undefined }, replace: true });
      }
    } catch (err) {
      if (token !== runSeq.current) return;
      if (bounceIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : c.parseErr);
      setView("desk");
    }
  }

  async function continueInChat() {
    if (!memo || !requireAccount()) return;
    try {
      let id = savedId;
      if (!id) id = (await persist(intake, memo)).id;
      navigate({ to: "/ask", search: { matter: matter?.id ?? undefined, memo: id, chat: undefined } });
    } catch (err) {
      if (bounceIfUnauthorized(err)) return;
      toast.error(c.parseErr);
    }
  }

  async function startDraft(kind: LetterKind) {
    if (!memo || !requireAccount() || draftLock.current) return;
    draftLock.current = true;
    const token = ++runSeq.current;
    setError(null);
    setView("drafting");
    try {
      const result = await draftLetter({ data: { kind, intake: { ...intake, lang: memoLang }, memo } });
      if (token !== runSeq.current) return;
      if (!result.ok) {
        toast.error(mapAiError(result.error, true));
        setView("memo");
        return;
      }
      setLetter(result.letter);
      setLetterOnFile(false);
      setView("letter");
      if (matter) {
        try {
          await attachDraftToMatter({
            data: {
              matterId: matter.id,
              title: (result.letter.heading || result.letter.kind).slice(0, 240),
              kind: result.letter.kind === "notice" || result.letter.kind === "reply" ? "notice" : "pleading",
              body: formatLegalLetter(result.letter),
            },
          });
          setLetterOnFile(true);
          toast.success(c.savedOnFile);
        } catch (err) {
          if (bounceIfUnauthorized(err)) return;
        }
      }
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
    if (!memo || !requireAccount()) return;
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

  async function onDelete(id: string) {
    if (!requireAccount()) return;
    try {
      await deleteMemoRecord({ data: id });
      setHistory((prev) => prev.filter((h) => h.id !== id && h.parentId !== id));
      if (savedId === id) setSavedId(null);
      toast.success(c.memoDeleted);
    } catch (err) {
      bounceIfUnauthorized(err);
    }
  }

  function openMemo(item: HistoryItem) {
    setHistoryQuery("");
    navigate({ to: "/research", search: { memo: item.id, matter: undefined, view: undefined } });
  }

  function backToDesk() {
    setError(null);
    setLetter(null);
    setMemo(null);
    applied.current = "";
    setView("desk");
    navigate({ to: "/research", search: { matter: matter?.id ?? undefined, memo: undefined, view: undefined } });
  }

  async function onFiled(id: string) {
    const bundle = await getMatterBundle({ data: id }).catch(() => null);
    if (bundle) setMatter({ id: bundle.matter.id, title: bundle.matter.title });
    refreshCounts();
  }

  const prefill: NewMatterPrefill | undefined = memo
    ? {
        title: memo.causeTitle || memo.title,
        notes: memo.factsSummary,
        proceeding: PROCEEDING_BY_AREA[intake.area] ?? "civil",
        ourSide: intake.side === "respondent" ? "respondent" : "petitioner",
      }
    : undefined;

  const header = (
    <header className="mb-6">
      <h1 className="page-title">{c.pageTitle}</h1>
      <p className="page-lead">{c.pageLead}</p>
      <div className="mt-4">{children}</div>
    </header>
  );

  if (showHistory && view !== "running") {
    return (
      <>
        {header}
        <MemoHistory
          lang={lang}
          items={history}
          query={historyQuery}
          matterTitles={matterTitles}
          onQuery={setHistoryQuery}
          onOpen={openMemo}
          onDelete={(id) => void onDelete(id)}
        />
      </>
    );
  }

  return (
    <>
      {view === "desk" ? (
        <>
          {header}
          <IntakeForm
            intake={intake}
            lang={lang}
            busy={false}
            error={error}
            files={files}
            matter={matter}
            recent={history.filter((h) => !h.parentId)}
            onChange={setIntake}
            onSubmit={() => void start()}
            onFiles={setFiles}
            onOpenMemo={openMemo}
          />
          <p className="fineprint mt-10 max-w-2xl">{c.disclaimer}</p>
        </>
      ) : null}
      {view === "running" ? <ResearchStage lang={lang} elapsed={elapsed} onCancel={cancelRun} mode="research" /> : null}
      {view === "drafting" ? <ResearchStage lang={lang} elapsed={elapsed} onCancel={cancelRun} mode="letter" /> : null}
      {view === "memo" && memo ? (
        <MemoView
          lang={lang}
          memo={memo}
          memoId={savedId}
          saved={Boolean(savedId)}
          parentTitle={parentTitle || null}
          matter={matter}
          prefill={prefill}
          onBack={backToDesk}
          onSave={() => void onSave()}
          onDraft={(kind) => void startDraft(kind)}
          onContinue={() => void continueInChat()}
          onFiled={(id) => void onFiled(id)}
        />
      ) : null}
      {view === "memo" && !memo ? <div className="skeleton h-96" aria-hidden /> : null}
      {view === "letter" && letter ? (
        <LetterView
          lang={lang}
          letter={letter}
          onFile={letterOnFile}
          matter={matter}
          onFiled={(id) => {
            setLetterOnFile(true);
            void onFiled(id);
          }}
          onBack={() => {
            setView("memo");
            setError(null);
          }}
        />
      ) : null}
    </>
  );
}
