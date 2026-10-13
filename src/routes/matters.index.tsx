import { useEffect, useMemo } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, FolderOpen, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { GuestPanel } from "@/components/guest-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { openNewMatter } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { dueState, formatDay } from "@/lib/dates";
import { p, statusLabel } from "@/lib/practice/copy";
import { todayISO } from "@/lib/practice/ids";
import { listMatters } from "@/lib/practice/store";
import type { Matter } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import { stageDef } from "@/lib/practice/workflow";
import type { OutputLang } from "@/lib/research/types";
import { useSwrState } from "@/lib/swr";
import { cn } from "@/lib/utils";

type Filter = "active" | "all" | "closed";
type MattersSearch = { q?: string; show?: Filter };

export const Route = createFileRoute("/matters/")({
  validateSearch: (search: Record<string, unknown>): MattersSearch => ({
    q: typeof search.q === "string" && search.q.length > 0 ? search.q : undefined,
    show: search.show === "all" || search.show === "closed" ? search.show : undefined,
  }),
  // Server-side first load (session cookie rides along); null falls back to the client fetch.
  loader: async () => {
    try {
      return (await listMatters()) as Matter[];
    } catch {
      return null;
    }
  },
  staleTime: 0,
  component: MattersIndexPage,
});

function matches(m: Matter, q: string) {
  if (!q) return true;
  const hay = [m.title, m.courtName, m.caseNumber, m.cnr, m.clientName].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function MattersIndexPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate({ from: "/matters/" });
  const { q = "", show = "active" } = Route.useSearch();
  const loaded = Route.useLoaderData() as Matter[] | null;
  const [matters, setMatters] = useSwrState<Matter[] | null>("matters", user?.id, loaded);
  const c = p(lang);
  const today = todayISO();

  useEffect(() => {
    if (loaded) setMatters(loaded);
  }, [loaded]);

  useEffect(() => {
    if (!user || loaded) return;
    listMatters()
      .then((rows) => setMatters(rows as Matter[]))
      .catch((err) => {
        if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      });
  }, [user?.id]);

  const counts = useMemo(() => {
    const all = matters ?? [];
    return {
      active: all.filter((m) => m.status !== "closed").length,
      closed: all.filter((m) => m.status === "closed").length,
      all: all.length,
    };
  }, [matters]);

  const rows = useMemo(
    () =>
      (matters ?? []).filter(
        (m) =>
          (show === "all" || (show === "closed" ? m.status === "closed" : m.status !== "closed")) && matches(m, q.trim()),
      ),
    [matters, q, show],
  );

  function setSearch(next: MattersSearch) {
    navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });
  }

  return (
    <AppShell lang={lang} onLang={onLang} active="matters">
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {user || isPending ? (
        <>
          <header className="page-head">
            <div className="page-head-text">
              <h1 className="page-title">{c.matters}</h1>
              <p className="page-lead">{c.mattersLead}</p>
            </div>
            {matters && matters.length > 0 ? (
              <div className="page-head-actions">
                <Button onClick={() => openNewMatter({ mode: "cnr" })}>
                  <Plus className="size-4" aria-hidden />
                  {c.newMatter}
                </Button>
              </div>
            ) : null}
          </header>

          {matters === null ? (
            <div className="skeleton h-64" aria-hidden />
          ) : matters.length === 0 ? (
            <EmptyMatters lang={lang} />
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                  <Input
                    type="search"
                    value={q}
                    onChange={(e) => setSearch({ q: e.target.value || undefined })}
                    placeholder={c.searchMatters}
                    aria-label={c.searchMatters}
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
                <div role="tablist" aria-label={c.status} className="seg self-start">
                  {(["active", "all", "closed"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={show === key}
                      className="seg-btn gap-1.5"
                      onClick={() => setSearch({ show: key === "active" ? undefined : key })}
                    >
                      {key === "active" ? c.filterActive : key === "all" ? c.filterAll : c.filterClosed}
                      <span className="tabular-nums text-subtle">{counts[key]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="list-empty !px-0">{c.noMatchMatters}</p>
              ) : (
                <ul className="list">
                  {rows.map((m) => (
                    <MatterRow key={m.id} m={m} lang={lang} today={today} />
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

function MatterRow({ m, lang, today }: { m: Matter; lang: OutputLang; today: string }) {
  const c = p(lang);
  const st = stageDef(m.proceeding, m.stage);
  const next = m.nextHearingOn ? dueState(m.nextHearingOn, today) : null;
  const upcoming = next && next.kind !== "overdue";
  const dateText = !upcoming
    ? c.noDate
    : next.kind === "today"
      ? c.todayLabel
      : next.kind === "tomorrow"
        ? c.tomorrowLabel
        : formatDay(m.nextHearingOn, lang, today);
  return (
    <li>
      <Link to="/matters/$id" params={{ id: m.id }} className="list-row">
        <span className="list-main">
          <span className="flex flex-wrap items-center gap-2">
            <span className="list-title">{m.title}</span>
            {m.status !== "active" ? <Badge>{statusLabel(lang, m.status)}</Badge> : null}
          </span>
          <span className="list-meta">
            {m.courtName ? <span>{m.courtName}</span> : null}
            {m.caseNumber ? <span className="tabular-nums">{m.caseNumber}</span> : null}
            {st ? <span>{lang === "hi" ? st.labelHi : st.label}</span> : null}
          </span>
        </span>
        <span className="hidden w-28 shrink-0 text-right sm:block">
          <span className="block text-xs text-subtle">{c.nextHearing}</span>
          <span className={cn("block text-sm tabular-nums", upcoming ? "font-medium" : "text-subtle", next?.kind === "today" && "text-accent")}>
            {dateText}
          </span>
        </span>
        <span className={cn("text-sm tabular-nums sm:hidden", upcoming ? "font-medium" : "text-subtle")}>{upcoming ? dateText : ""}</span>
        <ChevronRight className="size-4 text-subtle" aria-hidden />
      </Link>
    </li>
  );
}

function EmptyMatters({ lang }: { lang: OutputLang }) {
  const c = p(lang);
  const navigate = useNavigate();
  return (
    <div className="empty max-w-2xl">
      <span className="empty-icon" aria-hidden>
        <FolderOpen className="size-[1.125rem]" />
      </span>
      <p className="empty-title">{c.emptyMattersTitle}</p>
      <p className="empty-text">{c.emptyMattersText}</p>
      <div className="mt-3 w-full max-w-lg">
        <EciCnrFetch lang={lang} onLanded={(landed) => navigate({ to: "/matters/$id", params: { id: landed.matterId } })} />
      </div>
      <button type="button" className="link-accent mt-1 text-sm" onClick={() => openNewMatter({ mode: "manual" })}>
        {c.pathCnrByHand}
      </button>
    </div>
  );
}
