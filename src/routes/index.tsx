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
import { readScroll } from "@/lib/scroll-memory";

export const Route = createFileRoute("/")({ component: TodayPage });

const tileClass = "tile";
const rowClass = "row";

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
    if (readScroll(window.location.pathname) > 0) return;
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
      {isPending ? <div className="skeleton h-40" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user ? (
        <div className="stagger-in">
          <p className="eyebrow">{c.kicker}</p>
          <h1 className="page-title">{c.hero}</h1>
          <p className="page-lead">{c.tagline}</p>

          {board?.sampleLoaded ? (
            <div className="panel panel-split stack-tight">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.sampleBanner}</div>
                <p className="meta mt-1">{confirmExit ? c.clearSampleConfirm : c.clearSampleHint}</p>
              </div>
              <div className="panel-actions">
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
            <div className="panel panel-split stack-tight">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.loadSample}</div>
                <p className="meta mt-1">{c.sampleHint}</p>
              </div>
              <div className="panel-actions">
                <Button onClick={() => void loadSample()} disabled={busy} type="button">
                  {c.loadSample}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <button type="button" className={tileClass} onClick={() => scrollToId("hearings-today")}>
              <div className="tile-num">{counts?.hearingsToday ?? 0}</div>
              <div className="tile-label">{c.hearingsToday}</div>
            </button>
            <button type="button" className={tileClass} onClick={() => scrollToId("deadlines")}>
              <div className="tile-num">{counts?.deadlines ?? 0}</div>
              <div className="tile-label">{c.deadlines}</div>
            </button>
            <Link to="/inbox" className={tileClass}>
              <div className="tile-num">{counts?.unconfirmedOrders ?? 0}</div>
              <div className="tile-label">{c.ordersAction}</div>
            </Link>
            <button type="button" className={tileClass} onClick={() => scrollToId("stale")}>
              <div className="tile-num">{counts?.staleMatters ?? 0}</div>
              <div className="tile-label">{c.stale}</div>
            </button>
          </div>

          {empty ? (
            <div className="empty stack-tight max-w-lg">
              <p className="empty-text">{c.emptyToday}</p>
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link to="/matters">{c.newMatter}</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <section id="hearings-today" className="stack">
            <h2 className="section-title">{c.hearingsToday}</h2>
            {board && board.hearingsToday.length > 0 ? (
              <ul className="row-list sm:grid sm:grid-cols-2 sm:gap-3">
                {board.hearingsToday.map((h) => (
                  <li key={h.id}>
                    <Link
                      to="/matters/$id"
                      params={{ id: h.matterId }}
                      hash={h.id}
                      className="paper paper-link h-full px-4 py-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display text-xl tabular-nums">{h.listedAt || "—"}</span>
                        <span className="text-xs text-paper-muted">{h.courtName}</span>
                      </div>
                      <div className="mt-1.5 font-medium">{h.matterTitle}</div>
                      <div className="mt-1 text-sm text-paper-muted">{h.purpose || h.stage}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">{c.emptyDiary}</p>
            )}
          </section>

          <section id="deadlines" className="stack">
            <h2 className="section-title">{c.deadlines}</h2>
            {board && board.deadlines.length > 0 ? (
              <ul className="row-list">
                {board.deadlines.map((d) => (
                  <li key={d.id} className="row-item">
                    {d.matterId ? (
                      <Link to="/matters/$id" params={{ id: d.matterId }} hash={d.id} className={`${rowClass} min-w-0`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="row-title">{d.title}</div>
                            <div className="row-meta">
                              <span className="tabular-nums">{d.dueOn}</span>
                              <span aria-hidden>·</span>
                              <span className="truncate">{d.matterTitle}</span>
                            </div>
                          </div>
                          <TrustChip origin={d.origin} lang={lang} />
                        </div>
                      </Link>
                    ) : (
                      <div className={`${rowClass} min-w-0`}>
                        <div className="row-title">{d.title}</div>
                      </div>
                    )}
                    <div className="row-actions">
                      {d.matterId && classifyTaskDraft(d.title, d.sourceQuote).draftable ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/matters/$id" params={{ id: d.matterId }} hash={d.id}>
                            {c.draftForTask}
                          </Link>
                        </Button>
                      ) : null}
                      {d.status === "open" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void setTaskStatus({ data: { id: d.id, status: "done" } }).then(reload)}
                        >
                          {c.markDone}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">{c.deadlines}: 0</p>
            )}
          </section>

          <section id="tasks" className="stack">
            <h2 className="section-title">{c.tasks}</h2>
            {board && board.openTasks.length > 0 ? (
              <ul className="row-list">
                {board.openTasks.map((t) => (
                  <li key={t.id} className="row-item">
                    {t.matterId ? (
                      <Link to="/matters/$id" params={{ id: t.matterId }} hash={t.id} className={`${rowClass} min-w-0`}>
                        <div className="row-title">{t.title}</div>
                        <div className="row-meta">
                          <TrustChip origin={t.origin} lang={lang} />
                          <span className="truncate">{t.matterTitle}</span>
                          {t.dueOn ? <span className="tabular-nums">{t.dueOn}</span> : null}
                        </div>
                      </Link>
                    ) : (
                      <div className={`${rowClass} min-w-0`}>
                        <div className="row-title">{t.title}</div>
                      </div>
                    )}
                    <div className="row-actions">
                      {t.matterId && classifyTaskDraft(t.title, t.sourceQuote).draftable ? (
                        <Button asChild size="sm" variant="outline">
                          <Link to="/matters/$id" params={{ id: t.matterId }} hash={t.id}>
                            {c.draftForTask}
                          </Link>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void setTaskStatus({ data: { id: t.id, status: "done" } }).then(reload)
                        }
                      >
                        {c.markDone}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">{c.openTasks}: 0</p>
            )}
          </section>

          {board && board.unconfirmedOrders.length > 0 ? (
            <section id="orders" className="stack">
              <h2 className="section-title">{c.ordersAction}</h2>
              <ul className="row-list">
                {board.unconfirmedOrders.map((o) => (
                  <li key={o.id}>
                    <Link to="/inbox" className={rowClass}>
                      <div className="row-title">{o.matterTitle || c.orders}</div>
                      <div className="row-meta">{c.confirm}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {board && board.hearingsUpcoming.length > 0 ? (
            <section className="stack">
              <h2 className="section-title">{c.upcoming}</h2>
              <ul className="row-list">
                {board.hearingsUpcoming.map((h) => (
                  <li key={h.id}>
                    <Link to="/matters/$id" params={{ id: h.matterId }} hash={h.id} className={`${rowClass} flex items-center justify-between gap-3`}>
                      <span className="row-title truncate">{h.matterTitle}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {h.listedOn} {h.listedAt}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="stale" className="stack">
            <h2 className="section-title">{c.stale}</h2>
            {board && board.staleMatters.length > 0 ? (
              <ul className="row-list">
                {board.staleMatters.map((m) => {
                  const st = stageDef(m.proceeding, m.stage);
                  return (
                    <li key={m.id}>
                      <Link to="/matters/$id" params={{ id: m.id }} className={rowClass}>
                        <div className="row-title">{m.title}</div>
                        <div className="row-meta">
                          <span className="truncate">{m.courtName}</span>
                          <span aria-hidden>·</span>
                          <span>{st ? (lang === "hi" ? st.labelHi : st.label) : m.stage}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="section-note">{c.stale}: 0</p>
            )}
          </section>

          <p className="fineprint mt-14 max-w-2xl">{c.disclaimer}</p>
        </div>
      ) : null}
    </AppShell>
  );
}
