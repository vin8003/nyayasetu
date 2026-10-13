import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { openNewMatter } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dueState, formatLongDay, formatWeekday } from "@/lib/dates";
import { p } from "@/lib/practice/copy";
import { todayISO } from "@/lib/practice/ids";
import { listHearingsRange } from "@/lib/practice/store";
import type { Hearing } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import type { OutputLang } from "@/lib/research/types";
import { useSwrState } from "@/lib/swr";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/diary")({
  loader: async () => {
    try {
      return (await listHearingsRange()) as Hearing[];
    } catch {
      return null;
    }
  },
  staleTime: 0,
  component: DiaryPage,
});

function byDay(rows: Hearing[]) {
  const days = new Map<string, Hearing[]>();
  for (const h of rows) {
    const list = days.get(h.listedOn) ?? [];
    list.push(h);
    days.set(h.listedOn, list);
  }
  return [...days.entries()];
}

export function DiaryPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const loaded = Route.useLoaderData() as Hearing[] | null;
  const [hearings, setHearings] = useSwrState<Hearing[] | null>("diary", user?.id, loaded);
  const [showPast, setShowPast] = useState(false);
  const c = p(lang);
  const today = todayISO();

  useEffect(() => {
    if (loaded) setHearings(loaded);
  }, [loaded]);

  useEffect(() => {
    if (!user || loaded) return;
    listHearingsRange()
      .then((rows) => setHearings(rows as Hearing[]))
      .catch((err) => {
        if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      });
  }, [user?.id]);

  const rows = hearings ?? [];
  const ahead = rows.filter((h) => h.listedOn >= today);
  const past = rows.filter((h) => h.listedOn < today).reverse();
  const needOutcome = past.filter((h) => !h.outcome).length;

  return (
    <AppShell lang={lang} onLang={onLang} active="diary">
      {isPending ? <div className="skeleton h-40" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user ? (
        <>
          <header className="page-head">
            <div className="page-head-text">
              <h1 className="page-title">{c.diary}</h1>
              <p className="page-lead" suppressHydrationWarning>
                {formatLongDay(today, lang)}
              </p>
            </div>
          </header>

          {hearings === null ? (
            <div className="skeleton h-64" aria-hidden />
          ) : rows.length === 0 ? (
            <div className="empty max-w-xl">
              <span className="empty-icon" aria-hidden>
                <CalendarDays className="size-[1.125rem]" />
              </span>
              <p className="empty-title">{c.emptyDiary}</p>
              <p className="empty-text">{c.emptyDiaryText}</p>
              <div className="empty-actions">
                <Button onClick={() => openNewMatter({ mode: "cnr" })}>{c.pathCnrTitle}</Button>
                <Button asChild variant="outline">
                  <Link to="/matters">{c.matters}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl">
              {ahead.length === 0 ? <p className="mb-6 text-sm text-muted">{c.noUpcoming}</p> : null}
              {byDay(ahead).map(([day, list]) => (
                <DayGroup key={day} day={day} rows={list} lang={lang} today={today} />
              ))}

              {past.length > 0 ? (
                <section className="mt-10">
                  <button type="button" className="link-quiet inline-flex items-center gap-2 text-sm" aria-expanded={showPast} onClick={() => setShowPast((v) => !v)}>
                    {showPast ? (lang === "hi" ? "पिछली पेशियाँ छिपाएँ" : "Hide earlier listings") : lang === "hi" ? `पिछली पेशियाँ (${past.length})` : `Earlier listings (${past.length})`}
                    {needOutcome > 0 ? <Badge tone="warn">{lang === "hi" ? `${needOutcome} का नतीजा बाकी` : `${needOutcome} need an outcome`}</Badge> : null}
                  </button>
                  {showPast ? (
                    <div className="mt-4">
                      {byDay(past).map(([day, list]) => (
                        <DayGroup key={day} day={day} rows={list} lang={lang} today={today} />
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

function DayGroup({ day, rows, lang, today }: { day: string; rows: Hearing[]; lang: OutputLang; today: string }) {
  const c = p(lang);
  const state = dueState(day, today);
  const label = state?.kind === "today" ? c.todayLabel : state?.kind === "tomorrow" ? c.tomorrowLabel : formatWeekday(day, lang);
  return (
    <section className="day-group">
      <h2 className={cn("day-label", state?.kind === "today" && "text-accent")}>
        {label}
        {state?.kind === "today" || state?.kind === "tomorrow" ? <span>{formatWeekday(day, lang)}</span> : null}
      </h2>
      <ul className="list">
        {rows.map((h) => (
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
                {h.outcome ? <span className="mt-1 block text-[0.8125rem] text-muted">{h.outcome}</span> : null}
              </span>
              {h.listedOn < today && !h.outcome ? <Badge tone="warn">{c.recordHearing}</Badge> : null}
              <ChevronRight className="size-4 text-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
