import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bookmark, Trash2 } from "lucide-react";
import { SetuMark } from "@/components/setu-mark";
import { AuthChip } from "@/components/auth-chip";
import { IntakeForm, type PendingFile } from "@/components/intake-form";
import { ResearchStage } from "@/components/research-stage";
import { MemoView } from "@/components/memo-view";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { emptyIntake, type HistoryItem, type Intake, type LegalMemo, type OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { runResearch } from "@/lib/research/run";
import { extractUploads } from "@/lib/research/files";
import { deleteMemoRecord, listMemos, saveMemoRecord } from "@/lib/research/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

type View = "desk" | "running" | "memo" | "history";

const DRAFT_KEY = "nyayasetu.draft";

function isUnauthorized(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /unauthorized/i.test(message);
}

function fileToBase64(file: File): Promise<string> {
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

function Home() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [lang, setLang] = useState<OutputLang>("en");
  const [intake, setIntake] = useState<Intake>(() => emptyIntake("en"));
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [view, setView] = useState<View>("desk");
  const [memo, setMemo] = useState<LegalMemo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const runSeq = useRef(0);

  const c = t(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      sessionStorage.removeItem(DRAFT_KEY);
      const parsed = JSON.parse(raw) as { intake?: Intake; lang?: OutputLang };
      if (parsed.intake) setIntake(parsed.intake);
      if (parsed.lang) setLang(parsed.lang);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }
    listMemos()
      .then(setHistory)
      .catch((err) => {
        if (isUnauthorized(err)) void navigate({ to: "/login" });
      });
  }, [user, navigate]);

  useEffect(() => {
    if (view !== "running") return;
    setElapsed(0);
    const id = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [view]);

  function switchLang(next: OutputLang) {
    setLang(next);
    setIntake((prev) => ({ ...prev, lang: next }));
  }

  function requireAccount() {
    if (isPending) return false;
    if (user) return true;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ intake, lang }));
    } catch {
      /* ignore */
    }
    void navigate({ to: "/login" });
    return false;
  }

  function bounceIfUnauthorized(err: unknown) {
    if (!isUnauthorized(err)) return false;
    void navigate({ to: "/login" });
    return true;
  }

  function abandonRun() {
    // Client wait only. The createServerFn / xAI fetch keeps running.
    runSeq.current += 1;
  }

  function cancelRun() {
    abandonRun();
    setView("desk");
    setError(null);
  }

  async function persist(currentIntake: Intake, currentMemo: LegalMemo) {
    const item = await saveMemoRecord({ data: { intake: currentIntake, memo: currentMemo } });
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
        const uploaded = await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            mime: f.mime,
            base64: await fileToBase64(f.file),
          })),
        );
        const extracted = await extractUploads({ data: { files: uploaded } });
        if (token !== runSeq.current) return;
        const merged = [payload.facts.trim(), extracted.combined.trim()]
          .filter(Boolean)
          .join("\n\n")
          .slice(0, 20000);
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
    try {
      const result = await runResearch({ data: payload });
      if (token !== runSeq.current) return;
      if (!result.ok) {
        const mapped =
          result.error === "AI_UNAVAILABLE"
            ? c.aiDown
            : result.error === "TIMEOUT"
              ? c.timeout
              : result.error === "PARSE"
                ? c.parseErr
                : result.error;
        setError(mapped);
        setView("desk");
        return;
      }
      if (token !== runSeq.current) return;
      try {
        await persist(payload, result.memo);
      } catch (err) {
        if (bounceIfUnauthorized(err)) return;
      }
      if (token !== runSeq.current) return;
      setMemo(result.memo);
      setView("memo");
    } catch (err) {
      if (token !== runSeq.current) return;
      if (bounceIfUnauthorized(err)) return;
      setError(err instanceof Error ? err.message : c.parseErr);
      setView("desk");
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

  async function onDelete(id: string) {
    if (!requireAccount()) return;
    try {
      await deleteMemoRecord({ data: id });
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (savedId === id) setSavedId(null);
    } catch (err) {
      if (bounceIfUnauthorized(err)) return;
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="no-print sticky top-0 z-20 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            className="flex items-center gap-2.5"
            aria-label={c.app}
            onClick={() => {
              abandonRun();
              setView("desk");
              setError(null);
            }}
          >
            <SetuMark className="size-7" />
            <span className="hidden font-display text-lg tracking-tight sm:inline">{c.app}</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (!requireAccount()) return;
                abandonRun();
                setView("history");
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:text-fg"
              aria-label={c.history}
            >
              <Bookmark className="size-4 sm:hidden" />
              <span className="hidden sm:inline">{c.history}</span>
            </button>
            <div className="flex rounded-md bg-elevated p-0.5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              {(["hi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => switchLang(code)}
                  className={
                    lang === code
                      ? "h-8 rounded-sm px-2.5 text-xs font-medium bg-accent text-accent-fg"
                      : "h-8 rounded-sm px-2.5 text-xs font-medium text-muted hover:text-fg"
                  }
                >
                  {code === "hi" ? "हि" : "EN"}
                </button>
              ))}
            </div>
            <AuthChip lang={lang} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
        {view === "desk" ? (
          <div className="stagger-in">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{c.kicker}</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium tracking-tight sm:text-5xl">
              {c.hero}
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted sm:text-lg">{c.tagline}</p>
            {error ? (
              <p className="mt-5 max-w-xl rounded-md bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-8 sm:mt-10">
              <IntakeForm
                intake={intake}
                lang={lang}
                busy={false}
                error={null}
                files={files}
                onChange={setIntake}
                onSubmit={() => start()}
                onSample={(sample) => {
                  setIntake(sample);
                  setFiles([]);
                  setError(null);
                }}
                onFiles={setFiles}
              />
            </div>
            <p className="mt-10 max-w-2xl text-xs leading-relaxed text-subtle">{c.disclaimer}</p>
          </div>
        ) : null}

        {view === "running" ? (
          <ResearchStage lang={lang} elapsed={elapsed} onCancel={cancelRun} />
        ) : null}

        {view === "memo" && memo ? (
          <MemoView
            lang={lang}
            memo={memo}
            saved={Boolean(savedId)}
            onBack={() => {
              setView("desk");
              setError(null);
            }}
            onSave={() => void onSave()}
          />
        ) : null}

        {view === "history" ? (
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-3xl">{c.history}</h1>
              <Button variant="outline" onClick={() => setView("desk")}>
                {c.newBrief}
              </Button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{c.emptyHistory}</p>
            ) : (
              <ul className="space-y-2">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-stretch rounded-lg bg-surface shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:shadow-[0_0_0_1px_rgb(255_255_255/0.14)]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIntake(item.intake);
                        setMemo(item.memo);
                        setSavedId(item.id);
                        setView("memo");
                      }}
                      className="min-w-0 flex-1 px-4 py-3 text-left"
                    >
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="mt-1 text-xs text-muted">
                        {new Date(item.createdAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="inline-flex size-11 shrink-0 items-center justify-center text-muted hover:text-danger"
                      aria-label={c.deleteMemo}
                      onClick={() => void onDelete(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
