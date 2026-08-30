// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { p } from "@/lib/practice/copy";
import { useChamberLang } from "@/lib/practice/use-lang";
import { clearSampleChamber, getTodayBoard, seedSampleChamber, setTaskStatus } from "@/lib/practice/store";
import type { TodayBoard } from "@/lib/practice/types";
import { stageDef } from "@/lib/practice/workflow";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";

export const Route = createFileRoute("/")({ component: TodayPage });

const tileClass =
  "block min-h-11 w-full rounded-xl bg-surface px-4 py-4 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.08)] transition-[box-shadow,background-color] duration-150 hover:bg-elevated hover:shadow-[0_0_0_1px_rgb(255_255_255/0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70";
const rowClass =
  "block min-h-11 rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)] transition-[box-shadow,background-color] duration-150 hover:bg-elevated hover:shadow-[0_0_0_1px_rgb(255_255_255/0.16)]";

export function isUnauthorized(err) {
  return /unauthorized/i.test(err instanceof Error ? err.message : String(err ?? ""));
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
}

export function TodayPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [board, setBoard] = useState<TodayBoard | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const c = p(lang);

  async function reload() {
    try {
      setBoard(await getTodayBoard());
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    if (!user) {
      setBoard(null);
      return;
    }
    reload();
  }, [user]);

  useEffect(() => {
    if (!board) return;
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }, [board]);

  async function loadSample(refresh = false) {
    setConfirmExit(false);
    setBusy(true);
    try {
      const result = await seedSampleChamber();
      await reload();
      toast.success(refresh || result?.replaced ? c.reloadedSample : c.sampleLoaded);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.sampleErr);
    } finally {
      setBusy(false);
    }
  }

  async function exitSample() {
    setBusy(true);
    try {
      await clearSampleChamber();
      await reload();
      setConfirmExit(false);
      toast.success(c.clearedSample);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.sampleErr);
    } finally {
      setBusy(false);
    }
  }

  const counts = board?.counts;
  const empty =
    board &&
    board.counts.hearingsToday === 0 &&
    board.counts.deadlines === 0 &&
    board.staleMatters.length === 0 &&
    board.openTasks.length === 0 &&
    board.unconfirmedOrders.length === 0;

  return (
    <AppShell lang={lang} onLang={onLang} active="today">
      {isPending ? <div className="h-40 animate-pulse rounded-xl bg-elevated" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user ? (
        <div className="stagger-in">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{c.kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{c.hero}</h1>
          <p className="mt-3 max-w-xl text-base text-muted">{c.tagline}</p>

          {board?.sampleLoaded ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.sampleBanner}</div>
                <p className="mt-1 text-xs text-muted">{confirmExit ? c.clearSampleConfirm : c.clearSampleHint}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {confirmExit ? (
                  <>
                    <Button variant="outline" onClick={() => setConfirmExit(false)} disabled={busy} type="button">
                      {c.clearSampleNo}
                    </Button>
                    <Button variant="danger" onClick={() => void exitSample()} disabled={busy} type="button">
                      {c.clearSampleYes}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void loadSample(true)}
                      disabled={busy}
                      type="button"
                    >
                      {c.reloadSample}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmExit(true)}
                      disabled={busy}
                      type="button"
                    >
                      {c.clearSample}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-elevated px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.loadSample}</div>
                <p className="mt-1 text-xs text-muted">{c.sampleHint}</p>
              </div>
              <Button onClick={() => void loadSample()} disabled={busy} type="button">
                {c.loadSample}
              </Button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button type="button" className={tileClass} onClick={() => scrollToId("hearings-today")}>
              <div className="font-display text-3xl tabular-nums">{counts?.hearingsToday ?? 0}</div>
              <div className="mt-1 text-xs text-muted">{c.hearingsToday}</div>
            </button>
            <button type="button" className={tileClass} onClick={() => scrollToId("deadlines")}>
              <div className="font-display text-3xl tabular-nums">{counts?.deadlines ?? 0}</div>
              <div className="mt-1 text-xs text-muted">{c.deadlines}</div>
            </button>
            <Link to="/inbox" className={tileClass}>
              <div className="font-display text-3xl tabular-nums">{counts?.unconfirmedOrders ?? 0}</div>
              <div className="mt-1 text-xs text-muted">{c.ordersAction}</div>
            </Link>
            <button type="button" className={tileClass} onClick={() => scrollToId("stale")}>
              <div className="font-display text-3xl tabular-nums">{counts?.staleMatters ?? 0}</div>
              <div className="mt-1 text-xs text-muted">{c.stale}</div>
            </button>
          </div>

          {empty ? (
            <div className="mt-10 max-w-lg rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <p className="text-sm text-muted">{c.emptyToday}</p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/matters">{c.newMatter}</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <section id="hearings-today" className="mt-10 scroll-mt-20">
            <h2 className="font-display text-2xl">{c.hearingsToday}</h2>
            {board && board.hearingsToday.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {board.hearingsToday.map((h) => (
                  <li key={h.id}>
                    <Link
                      to="/matters/$id"
                      params={{ id: h.matterId }}
                      hash={h.id}
                      className="block rounded-xl bg-paper px-4 py-4 text-paper-ink shadow-paper"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display text-xl">{h.listedAt || "—"}</span>
                        <span className="text-xs text-paper-muted">{h.courtName}</span>
                      </div>
                      <div className="mt-1 font-medium">{h.matterTitle}</div>
                      <div className="mt-1 text-sm text-paper-muted">{h.purpose || h.stage}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{c.emptyDiary}</p>
            )}
          </section>

          <section id="deadlines" className="mt-10 scroll-mt-20">
            <h2 className="font-display text-2xl">{c.deadlines}</h2>
            {board && board.deadlines.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {board.deadlines.map((d) => (
                  <li key={d.id} className="flex items-stretch gap-2">
                    {d.matterId ? (
                      <Link to="/matters/$id" params={{ id: d.matterId }} hash={d.id} className={`${rowClass} min-w-0 flex-1`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{d.title}</div>
                            <div className="mt-1 text-xs text-muted">
                              {d.dueOn} · {d.matterTitle}
                            </div>
                          </div>
                          <TrustChip origin={d.origin} lang={lang} />
                        </div>
                      </Link>
                    ) : (
                      <div className={`${rowClass} min-w-0 flex-1`}>
                        <div className="text-sm font-medium">{d.title}</div>
                      </div>
                    )}
                    {d.matterId && classifyTaskDraft(d.title, d.sourceQuote).draftable ? (
                      <Link to="/matters/$id" params={{ id: d.matterId }} hash={d.id}>
                        <Button size="sm" variant="outline" className="self-center">
                          {c.draftForTask}
                        </Button>
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{c.deadlines}: 0</p>
            )}
          </section>

          <section id="tasks" className="mt-10 scroll-mt-20">
            <h2 className="font-display text-2xl">{c.tasks}</h2>
            {board && board.openTasks.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {board.openTasks.map((t) => (
                  <li key={t.id} className="flex items-stretch gap-2">
                    {t.matterId ? (
                      <Link to="/matters/$id" params={{ id: t.matterId }} hash={t.id} className={`${rowClass} min-w-0 flex-1`}>
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <TrustChip origin={t.origin} lang={lang} />
                          <span>{t.matterTitle}</span>
                          {t.dueOn ? <span>{t.dueOn}</span> : null}
                        </div>
                      </Link>
                    ) : (
                      <div className={`${rowClass} min-w-0 flex-1`}>
                        <div className="text-sm font-medium">{t.title}</div>
                      </div>
                    )}
                    {t.matterId && classifyTaskDraft(t.title, t.sourceQuote).draftable ? (
                      <Link to="/matters/$id" params={{ id: t.matterId }} hash={t.id}>
                        <Button size="sm" variant="outline" className="self-center">
                          {c.draftForTask}
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-center"
                      onClick={() =>
                        void setTaskStatus({ data: { id: t.id, status: "done" } }).then(reload)
                      }
                    >
                      {c.markDone}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{c.openTasks}: 0</p>
            )}
          </section>

          {board && board.unconfirmedOrders.length > 0 ? (
            <section id="orders" className="mt-10 scroll-mt-20">
              <h2 className="font-display text-2xl">{c.ordersAction}</h2>
              <ul className="mt-4 space-y-2">
                {board.unconfirmedOrders.map((o) => (
                  <li key={o.id}>
                    <Link to="/inbox" className={rowClass}>
                      <div className="text-sm font-medium">{o.matterTitle || c.orders}</div>
                      <div className="mt-1 text-xs text-muted">{c.confirm}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {board && board.hearingsUpcoming.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-2xl">{c.upcoming}</h2>
              <ul className="mt-4 space-y-2">
                {board.hearingsUpcoming.map((h) => (
                  <li key={h.id}>
                    <Link to="/matters/$id" params={{ id: h.matterId }} hash={h.id} className={`${rowClass} flex items-center justify-between gap-3 text-sm`}>
                      <span className="truncate font-medium">{h.matterTitle}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {h.listedOn} {h.listedAt}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="stale" className="mt-10 scroll-mt-20">
            <h2 className="font-display text-2xl">{c.stale}</h2>
            {board && board.staleMatters.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {board.staleMatters.map((m) => {
                  const st = stageDef(m.proceeding, m.stage);
                  return (
                    <li key={m.id}>
                      <Link to="/matters/$id" params={{ id: m.id }} className={rowClass}>
                        <div className="font-medium">{m.title}</div>
                        <div className="mt-1 text-xs text-muted">
                          {m.courtName} · {st ? (lang === "hi" ? st.labelHi : st.label) : m.stage}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{c.stale}: 0</p>
            )}
          </section>

          <p className="mt-12 max-w-2xl text-xs leading-relaxed text-subtle">{c.disclaimer}</p>
        </div>
      ) : null}
    </AppShell>
  );
}
