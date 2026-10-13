import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { SetupChecklist, Welcome, firstName } from "@/components/welcome";
import { refreshCounts } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dueState, formatDay, formatLongDay, formatWeekday, hourInIndia } from "@/lib/dates";
import { fill, p } from "@/lib/practice/copy";
import { todayISO } from "@/lib/practice/ids";
import { clearSampleChamber, getTodayBoard, setTaskStatus } from "@/lib/practice/store";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";
import { tasksWithoutTwins, twinIds } from "@/lib/practice/twins";
import type { Deadline, Hearing, Task, TodayBoard } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import type { OutputLang } from "@/lib/research/types";
import { useSwrState } from "@/lib/swr";
import { cn } from "@/lib/utils";

type Board = TodayBoard & { totals?: { matters: number; memos: number; confirmedOrders: number; chats: number } };

export const Route = createFileRoute("/")({
  // Fetch on the server during SSR (the session cookie rides along) so the board
  // is in the first HTML instead of waiting on hydration + a client round trip.
  // Signed-out or failing loads resolve to null and fall back to the client fetch.
  loader: async () => {
    try {
      return (await getTodayBoard()) as Board;
    } catch {
      return null;
    }
  },
  staleTime: 0,
  component: TodayPage,
});

export function isUnauthorized(err: unknown) {
  return /unauthorized/i.test(err instanceof Error ? err.message : String(err ?? ""));
}

function greeting(lang: OutputLang, name: string) {
  const c = p(lang);
  if (!name) return c.greetingNoName;
  const hour = hourInIndia();
  const template = hour < 12 ? c.greetingMorning : hour < 17 ? c.greetingAfternoon : c.greetingEvening;
  return fill(template, { name });
}

export function TodayPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const loaded = Route.useLoaderData() as Board | null;
  const [board, setBoard] = useSwrState<Board | null>("today", user?.id, loaded);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = p(lang);
  const today = todayISO();

  async function reload() {
    try {
      setBoard((await getTodayBoard()) as Board);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    if (loaded) setBoard(loaded);
  }, [loaded]);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setBoard(null);
      return;
    }
    if (!loaded) void reload();
  }, [user?.id, isPending]);

  async function markDone(id: string) {
    if (!board) return;
    const ids = twinIds(id, board.openTasks, board.deadlines);
    // Optimistic: the row leaves at once, with an undo in the toast.
    setBoard({
      ...board,
      deadlines: board.deadlines.filter((d) => !ids.includes(d.id)),
      openTasks: board.openTasks.filter((t) => !ids.includes(t.id)),
    });
    try {
      await Promise.all(ids.map((one) => setTaskStatus({ data: { id: one, status: "done" } })));
      toast.success(lang === "hi" ? "हो गया।" : "Marked done.", {
        action: {
          label: lang === "hi" ? "वापस लें" : "Undo",
          onClick: () => void Promise.all(ids.map((one) => setTaskStatus({ data: { id: one, status: "open" } }))).then(reload),
        },
      });
    } catch {
      toast.error(c.parseErr);
    }
    void reload();
  }

  async function removeDemo() {
    setBusy(true);
    try {
      await clearSampleChamber();
      setConfirmDemo(false);
      toast.success(c.clearedSample);
      refreshCounts();
      await reload();
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.sampleErr);
    } finally {
      setBusy(false);
    }
  }

  const name = firstName(user?.displayName);
  const totals = board?.totals;
  const fresh = Boolean(board && totals && totals.matters === 0 && totals.memos === 0);

  return (
    <AppShell lang={lang} onLang={onLang} active="today">
      {isPending || (user && !board) ? <TodaySkeleton /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} onLang={onLang} variant="landing" /> : null}
      {user && board && fresh ? <Welcome lang={lang} name={user.displayName ?? ""} /> : null}
      {user && board && !fresh ? (
        <>
          <header className="page-head">
            <div className="page-head-text">
              <p className="greeting-date" suppressHydrationWarning>
                {formatLongDay(today, lang)}
              </p>
              <h1 className="page-title mt-0.5" suppressHydrationWarning>
                {greeting(lang, name)}
              </h1>
              <Summary board={board} lang={lang} today={today} />
            </div>
          </header>

          {board.sampleLoaded ? (
            <div className="callout mb-6" role="status">
              <Info className="size-4 text-muted" aria-hidden />
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                <span>{c.legacySample}</span>
                <Button variant="outline" size="sm" onClick={() => setConfirmDemo(true)}>
                  {c.clearSample}
                </Button>
              </div>
            </div>
          ) : null}

          {totals ? <SetupChecklist lang={lang} userId={user.id} totals={totals} /> : null}

          <div className="split">
            <div className="min-w-0">
              <HearingsToday hearings={board.hearingsToday} lang={lang} />
              <Attention board={board} lang={lang} today={today} onDone={(id) => void markDone(id)} />
            </div>
            <aside className="split-aside min-w-0">
              <ComingUp hearings={board.hearingsUpcoming} lang={lang} today={today} />
              <QuietFiles board={board} lang={lang} />
            </aside>
          </div>

          <p className="fineprint mt-12 max-w-2xl">{c.disclaimer}</p>
        </>
      ) : null}

      <ConfirmDialog
        open={confirmDemo}
        onOpenChange={setConfirmDemo}
        title={c.clearSample}
        text={c.clearSampleConfirm}
        confirmLabel={c.clearSampleYes}
        cancelLabel={c.clearSampleNo}
        danger
        busy={busy}
        onConfirm={() => void removeDemo()}
      />
    </AppShell>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-2 h-7 w-72" />
      <div className="split mt-8">
        <div className="skeleton h-56" />
        <div className="skeleton h-40" />
      </div>
    </div>
  );
}

/** A copy string with its {n} set in bold, so the number carries the line. */
function Counted({ template, n }: { template: string; n: number }) {
  const [before, after = ""] = template.split("{n}");
  return (
    <>
      {before}
      <strong>{n}</strong>
      {after}
    </>
  );
}

function Summary({ board, lang, today }: { board: Board; lang: OutputLang; today: string }) {
  const c = p(lang);
  const overdue = board.deadlines.filter((d) => dueState(d.dueOn, today)?.kind === "overdue").length;
  const week = board.deadlines.filter((d) => {
    const s = dueState(d.dueOn, today);
    return s && s.kind !== "overdue" && s.kind !== "later";
  }).length;
  const n = board.counts.hearingsToday;
  const orders = board.counts.unconfirmedOrders;
  return (
    <p className="summary-line">
      <a href="#in-court">
        {n === 0 ? c.sumHearingsNone : n === 1 ? c.sumHearingsOne : <Counted template={c.sumHearings} n={n} />}
      </a>
      {orders > 0 ? (
        <Link to="/inbox">
          <Counted template={c.sumOrders} n={orders} />
        </Link>
      ) : null}
      {overdue > 0 ? (
        <a href="#attention" className="is-alert">
          <Counted template={c.sumOverdue} n={overdue} />
        </a>
      ) : null}
      {week > 0 ? (
        <a href="#attention">
          <Counted template={c.sumDueWeek} n={week} />
        </a>
      ) : null}
    </p>
  );
}

function HearingsToday({ hearings, lang }: { hearings: Hearing[]; lang: OutputLang }) {
  const c = p(lang);
  return (
    <section id="in-court" className="section">
      <div className="section-head">
        <h2 className="section-title">
          {c.inCourtToday}
          {hearings.length ? <span className="count">{hearings.length}</span> : null}
        </h2>
        <Link to="/diary" className="link-quiet text-[0.8125rem]">
          {c.openDiary}
        </Link>
      </div>
      {hearings.length === 0 ? (
        <p className="list-empty !px-0 !pt-0">{c.nothingToday}</p>
      ) : (
        <ul className="list">
          {hearings.map((h) => (
            <li key={h.id}>
              <Link to="/matters/$id" params={{ id: h.matterId }} hash={h.id} className="list-row">
                <span className="agenda-time">{h.listedAt}</span>
                <span className="list-main">
                  <span className="list-title block">{h.matterTitle}</span>
                  <span className="list-meta">
                    {h.courtName ? <span>{h.courtName}</span> : null}
                    {h.courtRoom ? <span>{h.courtRoom}</span> : null}
                    {h.purpose ? <span>{h.purpose}</span> : null}
                  </span>
                </span>
                <ChevronRight className="size-4 text-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DueLabel({ iso, today, lang }: { iso: string | null; today: string; lang: OutputLang }) {
  const c = p(lang);
  const state = dueState(iso, today);
  if (!state) return null;
  const text =
    state.kind === "overdue"
      ? `${c.overdue} · ${formatDay(iso, lang, today)}`
      : state.kind === "today"
        ? c.dueToday
        : state.kind === "tomorrow"
          ? c.dueTomorrow
          : state.kind === "soon"
            ? fill(c.dueIn, { n: state.days })
            : formatDay(iso, lang, today);
  return <span className={cn("tabular-nums", state.kind === "overdue" && "font-medium text-danger", state.kind === "today" && "font-medium text-fg")}>{text}</span>;
}

function WorkRow({
  item,
  kind,
  lang,
  today,
  onDone,
}: {
  item: Deadline | Task;
  kind: "deadline" | "task";
  lang: OutputLang;
  today: string;
  onDone: (id: string) => void;
}) {
  const c = p(lang);
  const draftable = Boolean(item.matterId) && classifyTaskDraft(item.title, item.sourceQuote).draftable;
  return (
    <li className="flex items-center">
      <button
        type="button"
        className="ml-3 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-hairline text-transparent transition-colors hover:border-accent hover:text-accent"
        aria-label={`${c.markDone}: ${item.title}`}
        onClick={() => onDone(item.id)}
      >
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </button>
      {item.matterId ? (
        <Link to="/matters/$id" params={{ id: item.matterId }} hash={item.id} className="list-row min-w-0 flex-1 !pl-3">
          <span className="list-main">
            <span className="list-title block">{item.title}</span>
            <span className="list-meta">
              {item.dueOn ? <DueLabel iso={item.dueOn} today={today} lang={lang} /> : null}
              {item.matterTitle ? <span className="truncate">{item.matterTitle}</span> : null}
            </span>
          </span>
          {item.origin === "court_direction" || item.origin === "ai_suggestion" ? (
            <TrustChip origin={item.origin} lang={lang} />
          ) : null}
          {draftable ? <span className="chip hidden sm:inline-flex">{c.draftForTask}</span> : null}
        </Link>
      ) : (
        <div className="list-row min-w-0 flex-1 !pl-3">
          <span className="list-title">{item.title}</span>
        </div>
      )}
      <span className="sr-only">{kind}</span>
    </li>
  );
}

function Attention({ board, lang, today, onDone }: { board: Board; lang: OutputLang; today: string; onDone: (id: string) => void }) {
  const c = p(lang);
  const orders = board.unconfirmedOrders;
  const tasks = tasksWithoutTwins(board.openTasks, board.deadlines);
  const empty = orders.length === 0 && board.deadlines.length === 0 && tasks.length === 0;
  return (
    <section id="attention" className="section">
      <div className="section-head">
        <h2 className="section-title">{c.needsAttention}</h2>
      </div>
      {empty ? (
        <p className="list-empty !px-0 !pt-0">{c.allClear}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.length > 0 ? (
            <Link to="/inbox" className="list list-row !min-h-14 hover:!bg-elevated">
              <span className="count-badge">{orders.length}</span>
              <span className="list-main">
                <span className="list-title block">
                  {orders.length === 1 ? c.ordersWaitingOne : fill(c.ordersWaiting, { n: orders.length })}
                </span>
                <span className="list-meta">
                  {[...new Set(orders.map((o) => o.matterTitle).filter(Boolean))].slice(0, 3).map((t) => (
                    <span key={t} className="truncate">
                      {t}
                    </span>
                  ))}
                </span>
              </span>
              <span className="text-[0.8125rem] font-medium text-fg">{c.review}</span>
              <ChevronRight className="size-4 text-subtle" aria-hidden />
            </Link>
          ) : null}
          {board.deadlines.length > 0 || tasks.length > 0 ? (
            <ul className="list">
              {board.deadlines.map((d) => (
                <WorkRow key={d.id} item={d} kind="deadline" lang={lang} today={today} onDone={onDone} />
              ))}
              {tasks.slice(0, 10).map((t) => (
                <WorkRow key={t.id} item={t} kind="task" lang={lang} today={today} onDone={onDone} />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ComingUp({ hearings, lang, today }: { hearings: Hearing[]; lang: OutputLang; today: string }) {
  const c = p(lang);
  const days = new Map<string, Hearing[]>();
  for (const h of hearings) {
    const list = days.get(h.listedOn) ?? [];
    list.push(h);
    days.set(h.listedOn, list);
  }
  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">{c.comingUp}</h2>
      </div>
      {hearings.length === 0 ? (
        <p className="text-sm text-muted">{c.noUpcoming}</p>
      ) : (
        <div>
          {[...days.entries()].map(([day, rows]) => {
            const label = dueState(day, today)?.kind === "tomorrow" ? c.tomorrowLabel : formatWeekday(day, lang);
            return (
              <div key={day} className="day-group">
                <p className="day-label">{label}</p>
                <ul className="list">
                  {rows.map((h) => (
                    <li key={h.id}>
                      <Link to="/matters/$id" params={{ id: h.matterId }} hash={h.id} className="list-row !min-h-11 !py-2.5">
                        <span className="list-main">
                          <span className="list-title block !text-sm">{h.matterTitle}</span>
                          {h.purpose || h.listedAt ? (
                            <span className="list-meta !text-xs">
                              {h.listedAt ? <span>{h.listedAt}</span> : null}
                              {h.purpose ? <span className="truncate">{h.purpose}</span> : null}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function QuietFiles({ board, lang }: { board: Board; lang: OutputLang }) {
  const c = p(lang);
  if (board.staleMatters.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title">{c.quietFiles}</h2>
          <p className="text-xs text-muted">{c.quietHint}</p>
        </div>
      </div>
      <ul className="list">
        {board.staleMatters.slice(0, 6).map((m) => (
          <li key={m.id}>
            <Link to="/matters/$id" params={{ id: m.id }} className="list-row !min-h-11 !py-2.5">
              <span className="list-main">
                <span className="list-title block !text-sm">{m.title}</span>
                {m.courtName ? <span className="list-meta !text-xs">{m.courtName}</span> : null}
              </span>
              <ChevronRight className="size-4 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
