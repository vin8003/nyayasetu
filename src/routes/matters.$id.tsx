import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePlus2,
  FileText,
  Gavel,
  ListPlus,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import {
  DeadlineBody,
  DocumentBody,
  EventBody,
  HearingBody,
  MatterFileBody,
  MatterSheet,
  MemoFileBody,
  OrderBody,
  StatuteFileBody,
  TaskBody,
  kindLabel,
  sourceBadge,
} from "@/components/matter-record";
import { StagePanel } from "@/components/stage-panel";
import { TrustChip } from "@/components/trust-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { refreshCounts } from "@/lib/app-events";
import { verifyTimelineEvent } from "@/lib/court-import/store";
import { dueState, formatDay, formatWeekday } from "@/lib/dates";
import { fill, p, sideLabel, statusLabel } from "@/lib/practice/copy";
import { prepareHearingBrief } from "@/lib/practice/hearing-brief";
import { todayISO } from "@/lib/practice/ids";
import { writeInboxDraft } from "@/lib/practice/inbox-draft";
import { findInBundle, lastOrderId, nextHearingId, relatedIdForEvent } from "@/lib/practice/record-links";
import { statutesFromMemos } from "@/lib/practice/statute-map";
import {
  addHearing,
  addTask,
  attachDraftToMatter,
  getMatterBundle,
  recordHearing,
  savePastedDocument,
  setMatterStage,
  setTaskStatus,
  updateDocument,
  updateEvent,
  updateHearing,
  updateMatter,
  updateOrder,
  updateWorkItem,
} from "@/lib/practice/store";
import { draftForWork } from "@/lib/practice/task-draft";
import { tasksWithoutTwins, twinIds } from "@/lib/practice/twins";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";
import type { Deadline, Hearing, MatterBundle, Task } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import { proceedingDef, stagesFor } from "@/lib/practice/workflow";
import { fileToBase64 } from "@/lib/read-file";
import { extractUploads } from "@/lib/research/files";
import { listMemos } from "@/lib/research/store";
import type { HistoryItem, OutputLang } from "@/lib/research/types";
import { cn } from "@/lib/utils";

const TABS = ["overview", "hearings", "papers", "work", "research", "timeline"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/matters/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: TABS.includes(search.tab as Tab) && search.tab !== "overview" ? (search.tab as Tab) : undefined,
  }),
  component: MatterDetailPage,
});

type Brief = {
  purpose: string;
  lastOrder: string;
  lastHearing: string;
  courtDirected: string;
  ourPosition: string;
  opponentPosition: string;
  issues: string[];
  documentsToReview: string[];
  authorities: string[];
  openItems: string[];
  expectedNext: string;
  caveats: string[];
};

/** Panels that are not records: forms and generated views opened over the file. */
type Panel = "file" | "sync" | "brief" | "new-hearing" | "new-paper";

function tabFor(kind: string): Tab {
  if (kind === "hearing") return "hearings";
  if (kind === "document" || kind === "order") return "papers";
  if (kind === "task" || kind === "deadline") return "work";
  if (kind === "event") return "timeline";
  return "overview";
}

function isUnauthorized(err: unknown) {
  return /unauthorized/i.test(String(err));
}

export function MatterDetailPage() {
  const { id } = Route.useParams();
  const { tab: tabParam } = Route.useSearch();
  const tab: Tab = tabParam ?? "overview";
  const { lang, onLang } = useChamberLang();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<MatterBundle | null>(null);
  const [fileMemos, setFileMemos] = useState<HistoryItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [briefing, setBriefing] = useState(false);
  const [draftingId, setDraftingId] = useState("");
  const [workDrafts, setWorkDrafts] = useState<Record<string, string>>({});
  const landedOnHash = useRef(false);
  const c = p(lang);
  const today = todayISO();

  async function reload() {
    try {
      const [next, memos] = await Promise.all([
        getMatterBundle({ data: id }),
        listMemos({ data: { matterId: id } }).catch(() => [] as HistoryItem[]),
      ]);
      if (!next) {
        navigate({ to: "/matters" });
        return;
      }
      setBundle(next as MatterBundle);
      setFileMemos(memos);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    landedOnHash.current = Boolean(window.location.hash);
    setBundle(null);
    setBrief(null);
    void reload();
  }, [id]);

  // A deep link (#recordId from Today or the Diary) opens that record on its tab.
  useEffect(() => {
    if (!bundle) return;
    const hid = window.location.hash.replace(/^#/, "");
    if (!hid) return;
    const located = findInBundle(bundle, hid);
    if (located) {
      setOpenId(hid);
      const t = tabFor(located.kind);
      if (t !== tab) navigate({ to: "/matters/$id", params: { id }, search: { tab: t === "overview" ? undefined : t }, hash: hid, replace: true });
    }
  }, [bundle]);

  function setTab(next: Tab) {
    navigate({ to: "/matters/$id", params: { id }, search: { tab: next === "overview" ? undefined : next }, replace: true });
  }

  function openRecord(recordId: string | null | undefined) {
    if (!recordId || !bundle) return;
    if (recordId === "hearings") return setTab("hearings");
    if (recordId === "orders") return setTab("papers");
    if (recordId === "file" || recordId === "notes") return setPanel("file");
    if (findInBundle(bundle, recordId) || recordId.startsWith("memo:") || recordId.startsWith("stat:")) setOpenId(recordId);
  }

  function closeRecord() {
    if (landedOnHash.current && window.history.length > 1) {
      landedOnHash.current = false;
      window.history.back();
      return;
    }
    setOpenId(null);
  }

  async function persist(run: () => Promise<{ ok?: boolean } | unknown>, done?: string) {
    try {
      const result = (await run()) as { ok?: boolean } | undefined;
      if (result && result.ok === false) {
        toast.error(c.parseErr);
        return;
      }
      toast.success(done ?? c.savedEntry);
      await reload();
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    }
  }

  async function markDone(itemId: string) {
    const ids = bundle ? twinIds(itemId, bundle.tasks, bundle.deadlines) : [itemId];
    await Promise.all(ids.map((one) => setTaskStatus({ data: { id: one, status: "done" } })));
    toast.success(lang === "hi" ? "हो गया।" : "Marked done.", {
      action: {
        label: lang === "hi" ? "वापस लें" : "Undo",
        onClick: () => void Promise.all(ids.map((one) => setTaskStatus({ data: { id: one, status: "open" } }))).then(reload),
      },
    });
    await reload();
  }

  async function onDraftWork(itemKind: "task" | "deadline", itemId: string) {
    if (!bundle) return;
    setDraftingId(itemId);
    try {
      const result = await draftForWork({ data: { matterId: bundle.matter.id, itemId, itemKind, lang } });
      if (!result.ok) {
        if ((result as { error?: string }).error === "PAYWALL") {
          toast.error(c.paywall);
          navigate({ to: "/billing" });
          return;
        }
        toast.error(c.failedAi);
        return;
      }
      if (!result.draftable) {
        toast.error(c.cannotDraft);
        return;
      }
      setWorkDrafts((prev) => ({ ...prev, [itemId]: String(result.body ?? "") }));
      toast.success(c.draftSaved);
      await reload();
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.failedAi);
    } finally {
      setDraftingId("");
    }
  }

  async function onBrief() {
    if (!bundle) return;
    setPanel("brief");
    if (brief) return;
    setBriefing(true);
    try {
      const result = await prepareHearingBrief({ data: bundle.matter.id });
      if (!result.ok) {
        setPanel(null);
        if ((result as { error?: string }).error === "PAYWALL") {
          toast.error(c.paywall);
          navigate({ to: "/billing" });
          return;
        }
        toast.error(c.failedAi);
        return;
      }
      setBrief((result as { brief: Brief }).brief);
    } catch (err) {
      setPanel(null);
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.failedAi);
    } finally {
      setBriefing(false);
    }
  }

  if (!bundle) {
    return (
      <AppShell lang={lang} onLang={onLang} active="matters">
        <div aria-hidden>
          <div className="skeleton h-4 w-24" />
          <div className="skeleton mt-3 h-8 w-80 max-w-full" />
          <div className="skeleton mt-2 h-4 w-64" />
          <div className="skeleton mt-8 h-10" />
          <div className="skeleton mt-6 h-64" />
        </div>
      </AppShell>
    );
  }

  const { matter } = bundle;
  const pending = bundle.orders.filter((o) => !o.confirmed);
  const openWork = [
    ...bundle.deadlines.filter((d) => d.status === "open"),
    ...tasksWithoutTwins(bundle.tasks, bundle.deadlines).filter((t) => t.status === "open"),
  ];
  const statutes = statutesFromMemos(fileMemos);
  const tabLabels: Record<Tab, string> = {
    overview: c.overview,
    hearings: c.hearings,
    papers: c.papers,
    work: c.work,
    research: c.research,
    timeline: c.timeline,
  };
  const tabCounts: Partial<Record<Tab, number>> = {
    hearings: bundle.hearings.length,
    papers: bundle.documents.length,
    work: openWork.length,
    research: fileMemos.length,
  };

  const sheet = recordSheet();

  function recordSheet(): { title: string; kicker?: string; body: ReactNode; linkedId?: string | null; linkedLabel?: string | null } | null {
    if (!openId || !bundle) return null;
    const m = bundle.matter;
    if (openId.startsWith("memo:")) {
      const item = fileMemos.find((row) => row.id === openId.slice(5));
      if (!item) return null;
      return {
        title: item.title,
        kicker: c.researchOnFile,
        body: (
          <MemoFileBody
            createdAt={item.createdAt}
            facts={item.memo?.factsSummary || ""}
            issues={(item.memo?.issues ?? []).map((row) => row.issue).filter(Boolean)}
            lang={lang}
            onOpenFull={() => navigate({ to: "/research", search: { matter: m.id, memo: item.id } })}
          />
        ),
      };
    }
    if (openId.startsWith("stat:")) {
      const s = statutes[Number(openId.slice(5))];
      return s ? { title: s.name, kicker: c.statuteMap, body: <StatuteFileBody s={s} /> } : null;
    }
    const located = findInBundle(bundle, openId);
    if (!located) return null;
    if (located.kind === "hearing") {
      const h = bundle.hearings.find((x) => x.id === located.id);
      if (!h) return null;
      const linkedOrder = bundle.orders.find((o) => o.orderDate === h.listedOn);
      return {
        title: h.purpose || c.hearings,
        kicker: `${formatWeekday(h.listedOn, lang)}${h.listedAt ? ` · ${h.listedAt}` : ""}`,
        body: (
          <HearingBody
            h={h}
            lang={lang}
            today={today}
            onSaveListing={(patch) => persist(() => updateHearing({ data: { id: h.id, ...patch } }))}
            onRecord={(patch) =>
              persist(() => recordHearing({ data: { hearingId: h.id, ...patch } }), lang === "hi" ? "पेशी दर्ज हो गई।" : "Outcome recorded.")
            }
          />
        ),
        linkedId: linkedOrder?.id,
        linkedLabel: linkedOrder ? c.orders : null,
      };
    }
    if (located.kind === "document") {
      const d = bundle.documents.find((x) => x.id === located.id);
      if (!d) return null;
      const linkedOrder = bundle.orders.find((o) => o.documentId === d.id);
      return {
        title: d.title,
        kicker: kindLabel(lang, d.kind),
        body: (
          <DocumentBody
            d={d}
            lang={lang}
            onSave={(patch) => persist(() => updateDocument({ data: { id: d.id, ...patch } }))}
            onReadOrder={() => {
              writeInboxDraft({ matterId: m.id, body: d.text, title: d.title });
              navigate({ to: "/inbox", search: { matter: m.id } });
            }}
          />
        ),
        linkedId: linkedOrder?.id,
        linkedLabel: linkedOrder ? c.orders : null,
      };
    }
    if (located.kind === "order") {
      const o = bundle.orders.find((x) => x.id === located.id);
      if (!o) return null;
      return {
        title: o.orderDate ? `${c.orders} · ${formatDay(o.orderDate, lang, today)}` : c.orders,
        kicker: o.confirmed ? c.confirm : c.waiting,
        body: (
          <OrderBody
            o={o}
            lang={lang}
            onSave={(patch) => persist(() => updateOrder({ data: { id: o.id, ...patch } }))}
            onReview={() => navigate({ to: "/inbox", search: { matter: m.id } })}
          />
        ),
        linkedId: o.documentId,
        linkedLabel: o.documentId ? c.papers : null,
      };
    }
    if (located.kind === "task" || located.kind === "deadline") {
      const isTask = located.kind === "task";
      const item = isTask ? bundle.tasks.find((x) => x.id === located.id) : bundle.deadlines.find((x) => x.id === located.id);
      if (!item) return null;
      const common = {
        lang,
        drafting: draftingId === item.id,
        draftText: workDrafts[item.id] || "",
        onDraft: () => void onDraftWork(isTask ? "task" : "deadline", item.id),
        onMarkDone: () => void markDone(item.id),
        onSave: (patch: { title: string; dueOn: string }) =>
          persist(() => updateWorkItem({ data: { id: item.id, kind: isTask ? "task" : "deadline", ...patch } })),
      };
      return {
        title: item.title,
        kicker: isTask ? c.taskTitle : c.deadline,
        body: isTask ? <TaskBody t={item as Task} {...common} /> : <DeadlineBody d={item as Deadline} {...common} />,
      };
    }
    if (located.kind === "event") {
      const e = bundle.timeline.find((x) => x.id === located.id);
      if (!e) return null;
      const related = relatedIdForEvent(e, bundle);
      return {
        title: e.title,
        kicker: c.timeline,
        body: (
          <EventBody
            e={e}
            lang={lang}
            onSave={(patch) => persist(() => updateEvent({ data: { id: e.id, ...patch } }))}
            onVerify={() => persist(() => verifyTimelineEvent({ data: { id: e.id, verification: "lawyer_verified" } }))}
          />
        ),
        linkedId: related && related !== e.id ? related : null,
        linkedLabel: related && related !== e.id ? c.openLinked : null,
      };
    }
    return null;
  }

  const meta = [matter.courtName, matter.caseNumber].filter(Boolean);

  return (
    <AppShell lang={lang} onLang={onLang} active="matters">
      <header className="page-head !pb-4">
        <div className="page-head-text">
          <Link to="/matters" className="back-link">
            <ChevronLeft className="size-4" aria-hidden />
            {c.matters}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{matter.title}</h1>
            {matter.status !== "active" ? <Badge>{statusLabel(lang, matter.status)}</Badge> : null}
          </div>
          <div className="matter-id">
            {meta.length ? <span>{meta.join(" · ")}</span> : null}
            {matter.cnr ? (
              <button
                type="button"
                className="copy-chip"
                title={c.copyCnr}
                onClick={async () => {
                  await navigator.clipboard.writeText(matter.cnr);
                  toast.success(c.copied);
                }}
              >
                {matter.cnr}
                <Copy className="size-3" aria-hidden />
              </button>
            ) : null}
            {matter.clientName ? <span>{matter.clientName}</span> : null}
          </div>
        </div>
        <div className="page-head-actions">
          <Button asChild>
            <Link to="/research" search={{ matter: matter.id, memo: undefined }}>
              <BookOpen className="size-4" aria-hidden />
              {c.attachResearch}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ask" search={{ matter: matter.id, chat: undefined, memo: undefined }}>
              <MessageSquare className="size-4" aria-hidden />
              {c.askMatter}
            </Link>
          </Button>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label={c.moreActions}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuContent align="end" className="w-60">
              <MenuItem icon={<CalendarPlus className="size-4" />} onSelect={() => setPanel("new-hearing")}>
                {c.addHearing}
              </MenuItem>
              <MenuItem icon={<FilePlus2 className="size-4" />} onSelect={() => setPanel("new-paper")}>
                {c.addPaper}
              </MenuItem>
              <MenuItem icon={<ListPlus className="size-4" />} onSelect={() => setTab("work")}>
                {c.addTask}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<ScrollText className="size-4" />} onSelect={() => void onBrief()}>
                {c.prepareBrief}
              </MenuItem>
              <MenuItem icon={<RefreshCw className="size-4" />} onSelect={() => setPanel("sync")}>
                {c.syncCase}
              </MenuItem>
              <MenuItem icon={<Gavel className="size-4" />} onSelect={() => navigate({ to: "/inbox", search: { matter: matter.id } })}>
                {c.analyseOrder}
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Pencil className="size-4" />} onSelect={() => setPanel("file")}>
                {c.editFile}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </header>

      {pending.length > 0 ? (
        <div className="callout is-warn mb-5" role="status">
          <Gavel className="size-4" aria-hidden />
          <span className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <span>{pending.length === 1 ? c.ordersPendingOne : fill(c.ordersPending, { n: pending.length })}</span>
            <Button size="sm" asChild>
              <Link to="/inbox" search={{ matter: matter.id }}>
                {c.reviewInInbox}
              </Link>
            </Button>
          </span>
        </div>
      ) : null}

      <nav className="tabs mb-6" role="tablist" aria-label={matter.title}>
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>
            {tabLabels[t]}
            {tabCounts[t] ? <span className="count">{tabCounts[t]}</span> : null}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <Overview
          bundle={bundle}
          lang={lang}
          today={today}
          openWork={openWork}
          onOpen={openRecord}
          onStage={(stage) => persist(() => setMatterStage({ data: { matterId: matter.id, stage } }))}
          onTab={setTab}
          onPanel={setPanel}
          onBrief={() => void onBrief()}
          onDone={(itemId) => void markDone(itemId)}
        />
      ) : null}
      {tab === "hearings" ? <HearingsTab bundle={bundle} lang={lang} today={today} onOpen={openRecord} onAdd={() => setPanel("new-hearing")} /> : null}
      {tab === "papers" ? <PapersTab bundle={bundle} lang={lang} today={today} onOpen={openRecord} onAdd={() => setPanel("new-paper")} /> : null}
      {tab === "work" ? (
        <WorkTab
          bundle={bundle}
          lang={lang}
          today={today}
          onOpen={openRecord}
          onDone={(itemId) => void markDone(itemId)}
          onDraft={(kind, itemId) => {
            setOpenId(itemId);
            void onDraftWork(kind, itemId);
          }}
          onAdd={async (title, dueOn) => {
            const result = await addTask({ data: { matterId: matter.id, title, dueOn: dueOn || undefined } });
            if (result?.duplicate) toast.message(c.alreadyOnFile);
            await reload();
          }}
        />
      ) : null}
      {tab === "research" ? <ResearchTab matterId={matter.id} memos={fileMemos} statutes={statutes} lang={lang} onOpen={openRecord} /> : null}
      {tab === "timeline" ? <TimelineTab bundle={bundle} lang={lang} onOpen={openRecord} /> : null}

      <p className="fineprint mt-12 max-w-2xl">{c.trustNote}</p>

      {sheet ? (
        <MatterSheet
          open
          lang={lang}
          title={sheet.title}
          kicker={sheet.kicker}
          onClose={closeRecord}
          linkedLabel={sheet.linkedLabel}
          onOpenLinked={sheet.linkedId ? () => openRecord(sheet.linkedId) : undefined}
        >
          {sheet.body}
        </MatterSheet>
      ) : null}

      <MatterSheet open={panel === "file"} lang={lang} title={c.editFile} kicker={matter.title} onClose={() => setPanel(null)}>
        <MatterFileBody
          matter={matter}
          lang={lang}
          onSave={async (patch) => {
            await persist(() => updateMatter({ data: { id: matter.id, ...patch } }));
            setPanel(null);
          }}
        />
      </MatterSheet>

      <MatterSheet open={panel === "sync"} lang={lang} title={c.syncTitle} kicker={matter.title} onClose={() => setPanel(null)}>
        <p className="mb-4 text-sm text-muted">{c.syncLead}</p>
        <EciCnrFetch
          lang={lang}
          matterId={matter.id}
          defaultCnr={matter.cnr || ""}
          onLanded={() => {
            setPanel(null);
            void reload();
          }}
        />
        <p className="mt-4 text-xs text-muted">
          {matter.lastSyncedAt ? `${c.lastSynced}: ${formatDay(String(matter.lastSyncedAt), lang, today)}` : c.neverSynced}
        </p>
      </MatterSheet>

      <MatterSheet open={panel === "brief"} lang={lang} title={c.hearingBrief} kicker={matter.title} onClose={() => setPanel(null)}>
        {briefing || !brief ? (
          <div className="flex flex-col gap-3" aria-busy>
            <p className="text-sm text-muted">{c.briefing}</p>
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-24" />
          </div>
        ) : (
          <BriefView brief={brief} lang={lang} matterId={matter.id} onSaved={() => void reload()} />
        )}
      </MatterSheet>

      <MatterSheet open={panel === "new-hearing"} lang={lang} title={c.addHearing} kicker={matter.title} onClose={() => setPanel(null)}>
        <NewHearingForm
          lang={lang}
          onSubmit={async (form) => {
            await persist(() => addHearing({ data: { matterId: matter.id, ...form } }), lang === "hi" ? "पेशी डायरी में जुड़ गई।" : "Listing added to the diary.");
            setPanel(null);
          }}
        />
      </MatterSheet>

      <MatterSheet open={panel === "new-paper"} lang={lang} title={c.addPaper} kicker={matter.title} onClose={() => setPanel(null)}>
        <NewPaperForm
          lang={lang}
          matterId={matter.id}
          onSaved={async () => {
            setPanel(null);
            await reload();
            setTab("papers");
          }}
        />
      </MatterSheet>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */

function Overview({
  bundle,
  lang,
  today,
  openWork,
  onOpen,
  onStage,
  onTab,
  onPanel,
  onBrief,
  onDone,
}: {
  bundle: MatterBundle;
  lang: OutputLang;
  today: string;
  openWork: Array<Task | Deadline>;
  onOpen: (id: string | null) => void;
  onStage: (stage: string) => Promise<void>;
  onTab: (tab: Tab) => void;
  onPanel: (panel: Panel) => void;
  onBrief: () => void;
  onDone: (id: string) => void;
}) {
  const c = p(lang);
  const { matter } = bundle;
  const proc = proceedingDef(matter.proceeding);
  const next = bundle.hearings.filter((h) => h.listedOn >= today).sort((a, b) => a.listedOn.localeCompare(b.listedOn))[0];
  const lastOrder = bundle.orders.find((o) => o.confirmed) ?? bundle.orders[0];
  const work = [...openWork].sort((a, b) => String(a.dueOn ?? "9999").localeCompare(String(b.dueOn ?? "9999"))).slice(0, 5);

  return (
    <div className="split">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-label={c.overview}>
          <dl className="facts">
            <div>
              <dt>
                <label htmlFor="ov-stage">{c.stage}</label>
              </dt>
              <dd className="mt-1">
                <Select id="ov-stage" value={matter.stage} onChange={(e) => void onStage(e.target.value)} className="h-8">
                  {stagesFor(matter.proceeding).map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === "hi" ? s.labelHi : s.label}
                    </option>
                  ))}
                </Select>
              </dd>
            </div>
            <div>
              <dt>{c.nextHearing}</dt>
              <dd className={cn(!next && "is-empty")}>
                {next ? (
                  <button type="button" className="inline-link tabular-nums" onClick={() => onOpen(next.id)}>
                    {next.listedOn === today ? c.todayLabel : formatWeekday(next.listedOn, lang)}
                  </button>
                ) : (
                  c.noDate
                )}
              </dd>
            </div>
            <div>
              <dt>{c.lastOrder}</dt>
              <dd className={cn(!matter.lastOrderOn && !lastOrder && "is-empty")}>
                {matter.lastOrderOn || lastOrder ? (
                  <button type="button" className="inline-link tabular-nums" onClick={() => onOpen(lastOrderId(bundle))}>
                    {matter.lastOrderOn ? formatDay(matter.lastOrderOn, lang, today) : c.orders}
                  </button>
                ) : (
                  c.noneYet
                )}
              </dd>
            </div>
            <div>
              <dt>{c.proceeding}</dt>
              <dd>{lang === "hi" ? proc.labelHi : proc.label}</dd>
            </div>
            <div>
              <dt>{c.ourSide}</dt>
              <dd>{sideLabel(lang, matter.ourSide)}</dd>
            </div>
            {matter.clientName ? (
              <div>
                <dt>{c.client}</dt>
                <dd>{matter.clientName}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">{c.nextHearing}</h2>
            <Button variant="ghost" size="sm" onClick={() => onPanel("new-hearing")}>
              <CalendarPlus className="size-4" aria-hidden />
              {c.addHearing}
            </Button>
          </div>
          {next ? (
            <div className="list">
              <button type="button" className="list-row" onClick={() => onOpen(next.id)}>
                <span className="list-date !w-auto min-w-24">
                  {next.listedOn === today ? c.todayLabel : formatWeekday(next.listedOn, lang)}
                  {next.listedAt ? <span className="block text-xs font-normal text-subtle">{next.listedAt}</span> : null}
                </span>
                <span className="list-main">
                  <span className="list-title block">{next.purpose || c.hearings}</span>
                  {next.courtRoom ? <span className="list-meta">{next.courtRoom}</span> : null}
                </span>
                <ChevronRight className="size-4 text-subtle" aria-hidden />
              </button>
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2.5">
                <Button size="sm" variant="outline" onClick={onBrief}>
                  <ScrollText className="size-3.5" aria-hidden />
                  {c.prepareBrief}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{c.emptyHearingsText}</p>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2 className="section-title">
              {c.openTasks}
              {openWork.length ? <span className="count">{openWork.length}</span> : null}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => onTab("work")}>
              {c.viewAll}
            </Button>
          </div>
          {work.length ? (
            <ul className="list">
              {work.map((item) => (
                <WorkLine key={item.id} item={item} lang={lang} today={today} onOpen={onOpen} onDone={onDone} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{c.emptyWork}</p>
          )}
        </section>

        {matter.parties?.length ? (
          <section>
            <h2 className="section-title mb-2">{c.parties}</h2>
            <dl className="facts">
              {matter.parties.map((party, i) => (
                <div key={i}>
                  <dt className="capitalize">{party.role}</dt>
                  <dd>{party.name}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <h2 className="section-title">{c.notes}</h2>
            <Button variant="ghost" size="sm" onClick={() => onPanel("file")}>
              <Pencil className="size-3.5" aria-hidden />
              {matter.notes?.trim() ? c.editFile : c.addNotes}
            </Button>
          </div>
          {matter.notes?.trim() ? (
            <p className="prose-plain max-w-prose text-[0.9375rem] text-fg">{matter.notes}</p>
          ) : (
            <p className="text-sm text-muted">{c.emptyNotes}</p>
          )}
        </section>
      </div>

      <aside className="split-aside flex min-w-0 flex-col gap-4">
        <StagePanel lang={lang} proceeding={matter.proceeding} stage={matter.stage} />
        <section className="card card-pad">
          <h2 className="section-title">{c.syncTitle}</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            {matter.lastSyncedAt ? `${c.lastSynced}: ${formatDay(String(matter.lastSyncedAt), lang, today)}` : c.neverSynced}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => onPanel("sync")}>
            <RefreshCw className="size-3.5" aria-hidden />
            {c.syncCase}
          </Button>
        </section>
      </aside>
    </div>
  );
}

function DueText({ iso, today, lang }: { iso: string | null; today: string; lang: OutputLang }) {
  const c = p(lang);
  const s = dueState(iso, today);
  if (!s) return null;
  const text =
    s.kind === "overdue"
      ? `${c.overdue} · ${formatDay(iso, lang, today)}`
      : s.kind === "today"
        ? c.dueToday
        : s.kind === "tomorrow"
          ? c.dueTomorrow
          : formatDay(iso, lang, today);
  return <span className={cn("tabular-nums", s.kind === "overdue" && "font-medium text-danger")}>{text}</span>;
}

function WorkLine({
  item,
  lang,
  today,
  onOpen,
  onDone,
  onDraft,
}: {
  item: Task | Deadline;
  lang: OutputLang;
  today: string;
  onOpen: (id: string) => void;
  onDone: (id: string) => void;
  onDraft?: () => void;
}) {
  const c = p(lang);
  const open = item.status === "open";
  const draftable = open && onDraft && classifyTaskDraft(item.title, item.sourceQuote).draftable;
  return (
    <li className="flex items-center">
      {open ? (
        <button
          type="button"
          className="ml-3 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-hairline text-transparent transition-colors hover:border-accent hover:text-accent"
          aria-label={`${c.markDone}: ${item.title}`}
          onClick={() => onDone(item.id)}
        >
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </button>
      ) : (
        <span className="ml-3 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-accent-fg" aria-hidden>
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      <button type="button" className="list-row min-w-0 flex-1 !pl-3" onClick={() => onOpen(item.id)}>
        <span className="list-main">
          <span className={cn("list-title block", !open && "text-muted line-through decoration-hairline")}>{item.title}</span>
          <span className="list-meta">
            {item.dueOn ? <DueText iso={item.dueOn} today={today} lang={lang} /> : null}
            {item.origin !== "lawyer" && item.origin !== "system" ? (
              <span>
                <TrustChip origin={item.origin} lang={lang} />
              </span>
            ) : null}
          </span>
        </span>
      </button>
      {draftable ? (
        <Button variant="ghost" size="sm" className="mr-2" onClick={onDraft}>
          <FileText className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{c.draftForTask}</span>
        </Button>
      ) : null}
    </li>
  );
}

function HearingsTab({
  bundle,
  lang,
  today,
  onOpen,
  onAdd,
}: {
  bundle: MatterBundle;
  lang: OutputLang;
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const c = p(lang);
  const ahead = bundle.hearings.filter((h) => h.listedOn >= today).sort((a, b) => a.listedOn.localeCompare(b.listedOn));
  const past = bundle.hearings.filter((h) => h.listedOn < today);
  const row = (h: Hearing) => (
    <li key={h.id}>
      <button type="button" className="list-row" onClick={() => onOpen(h.id)}>
        <span className="list-date !w-auto min-w-28">
          {h.listedOn === today ? c.todayLabel : formatWeekday(h.listedOn, lang)}
          {h.listedAt ? <span className="block text-xs font-normal text-subtle">{h.listedAt}</span> : null}
        </span>
        <span className="list-main">
          <span className="list-title block">{h.purpose || c.hearings}</span>
          <span className="list-meta">
            {h.courtRoom ? <span>{h.courtRoom}</span> : null}
            {h.outcome ? <span className="truncate">{h.outcome}</span> : null}
          </span>
        </span>
        {h.listedOn <= today && !h.outcome ? <Badge tone="warn">{c.recordHearing}</Badge> : null}
        <ChevronRight className="size-4 text-subtle" aria-hidden />
      </button>
    </li>
  );
  return (
    <div className="max-w-3xl">
      <div className="section-head">
        <h2 className="section-title">{c.upcoming}</h2>
        <Button size="sm" onClick={onAdd}>
          <CalendarPlus className="size-4" aria-hidden />
          {c.addHearing}
        </Button>
      </div>
      {ahead.length ? <ul className="list">{ahead.map(row)}</ul> : <p className="text-sm text-muted">{c.emptyHearingsText}</p>}
      {past.length ? (
        <>
          <h2 className="section-title mb-2.5 mt-8">{lang === "hi" ? "पिछली पेशियाँ" : "Earlier"}</h2>
          <ul className="list">{past.map(row)}</ul>
        </>
      ) : null}
    </div>
  );
}

function PapersTab({
  bundle,
  lang,
  today,
  onOpen,
  onAdd,
}: {
  bundle: MatterBundle;
  lang: OutputLang;
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const c = p(lang);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section>
        <div className="section-head">
          <h2 className="section-title">
            {c.papers}
            {bundle.documents.length ? <span className="count">{bundle.documents.length}</span> : null}
          </h2>
          <Button size="sm" onClick={onAdd}>
            <FilePlus2 className="size-4" aria-hidden />
            {c.addPaper}
          </Button>
        </div>
        {bundle.documents.length ? (
          <ul className="list">
            {bundle.documents.map((d) => (
              <li key={d.id}>
                <button type="button" className="list-row" onClick={() => onOpen(d.id)}>
                  <FileText className="size-4 shrink-0 text-subtle" aria-hidden />
                  <span className="list-main">
                    <span className="list-title block">{d.title}</span>
                    <span className="list-meta">
                      <span>{kindLabel(lang, d.kind)}</span>
                      {d.createdAt ? <span>{formatDay(d.createdAt, lang, today)}</span> : null}
                    </span>
                  </span>
                  {sourceBadge(lang, d.sourceKind)}
                  <ChevronRight className="size-4 text-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p className="empty-title">{c.emptyDocs}</p>
            <p className="empty-text">{c.emptyDocsText}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-2.5">
          {c.orders}
          {bundle.orders.length ? <span className="count">{bundle.orders.length}</span> : null}
        </h2>
        {bundle.orders.length ? (
          <ul className="list">
            {bundle.orders.map((o) => (
              <li key={o.id}>
                <button type="button" className="list-row" onClick={() => onOpen(o.id)}>
                  <Gavel className="size-4 shrink-0 text-subtle" aria-hidden />
                  <span className="list-main">
                    <span className="list-title block tabular-nums">{o.orderDate ? formatDay(o.orderDate, lang, today) : c.orders}</span>
                    <span className="list-meta no-dots">
                      <span className="line-clamp-1">{o.body}</span>
                    </span>
                  </span>
                  {o.confirmed ? <Badge tone="ok">{c.confirm}</Badge> : <Badge tone="warn">{c.waiting}</Badge>}
                  <ChevronRight className="size-4 text-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{c.emptyOrders}</p>
        )}
      </section>
    </div>
  );
}

function WorkTab({
  bundle,
  lang,
  today,
  onOpen,
  onDone,
  onDraft,
  onAdd,
}: {
  bundle: MatterBundle;
  lang: OutputLang;
  today: string;
  onOpen: (id: string) => void;
  onDone: (id: string) => void;
  onDraft: (kind: "task" | "deadline", id: string) => void;
  onAdd: (title: string, dueOn: string) => Promise<void>;
}) {
  const c = p(lang);
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const deadlines = bundle.deadlines.filter((d) => d.status === "open");
  const tasks = tasksWithoutTwins(bundle.tasks, bundle.deadlines).filter((t) => t.status === "open");
  const doneDeadlines = bundle.deadlines.filter((d) => d.status !== "open");
  const doneKeys = new Set(doneDeadlines.map((d) => d.title.trim().toLowerCase()));
  const done = [...doneDeadlines, ...bundle.tasks.filter((t) => t.status !== "open" && !doneKeys.has(t.title.trim().toLowerCase()))];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    setBusy(true);
    try {
      await onAdd(title.trim(), dueOn);
      setTitle("");
      setDueOn("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <Label htmlFor="new-task" className="sr-only">
          {c.addTask}
        </Label>
        <Input id="new-task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={c.taskPlaceholder} className="flex-1" autoComplete="off" />
        <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} aria-label={c.due} className="sm:w-44" />
        <Button type="submit" disabled={busy || title.trim().length < 2}>
          <ListPlus className="size-4" aria-hidden />
          {c.addTask}
        </Button>
      </form>

      {deadlines.length ? (
        <section>
          <h2 className="section-title mb-2.5">
            {c.deadlines}
            <span className="count">{deadlines.length}</span>
          </h2>
          <ul className="list">
            {deadlines.map((d) => (
              <WorkLine key={d.id} item={d} lang={lang} today={today} onOpen={onOpen} onDone={onDone} onDraft={() => onDraft("deadline", d.id)} />
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="section-title mb-2.5">
          {c.tasks}
          {tasks.length ? <span className="count">{tasks.length}</span> : null}
        </h2>
        {tasks.length ? (
          <ul className="list">
            {tasks.map((t) => (
              <WorkLine key={t.id} item={t} lang={lang} today={today} onOpen={onOpen} onDone={onDone} onDraft={() => onDraft("task", t.id)} />
            ))}
          </ul>
        ) : deadlines.length === 0 ? (
          <div className="empty">
            <p className="empty-title">{c.emptyWork}</p>
            <p className="empty-text">{c.emptyWorkText}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">{c.emptyWork}</p>
        )}
      </section>

      {done.length ? (
        <section>
          <button type="button" className="link-quiet text-sm" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            {showDone ? (lang === "hi" ? "पूरे हुए छिपाएँ" : "Hide completed") : lang === "hi" ? `पूरे हुए (${done.length})` : `Show completed (${done.length})`}
          </button>
          {showDone ? (
            <ul className="list mt-2.5">
              {done.map((item) => (
                <WorkLine key={item.id} item={item} lang={lang} today={today} onOpen={onOpen} onDone={onDone} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ResearchTab({
  matterId,
  memos,
  statutes,
  lang,
  onOpen,
}: {
  matterId: string;
  memos: HistoryItem[];
  statutes: ReturnType<typeof statutesFromMemos>;
  lang: OutputLang;
  onOpen: (id: string) => void;
}) {
  const c = p(lang);
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section>
        <div className="section-head">
          <h2 className="section-title">
            {c.researchOnFile}
            {memos.length ? <span className="count">{memos.length}</span> : null}
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/ask" search={{ matter: matterId, chat: undefined, memo: undefined }}>
                <MessageSquare className="size-4" aria-hidden />
                {c.askMatter}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/research" search={{ matter: matterId, memo: undefined }}>
                <BookOpen className="size-4" aria-hidden />
                {c.startResearch}
              </Link>
            </Button>
          </div>
        </div>
        {memos.length ? (
          <ul className="list">
            {memos.map((item) => (
              <li key={item.id}>
                <button type="button" className="list-row" onClick={() => onOpen(`memo:${item.id}`)}>
                  <BookOpen className="size-4 shrink-0 text-subtle" aria-hidden />
                  <span className="list-main">
                    <span className="list-title block">{item.title}</span>
                    <span className="list-meta">
                      <span>{formatDay(item.createdAt, lang)}</span>
                      {item.memo?.precedents?.length ? (
                        <span>
                          {item.memo.precedents.filter((pr) => pr.verified).length}/{item.memo.precedents.length}{" "}
                          {lang === "hi" ? "नज़ीरें जाँची" : "authorities verified"}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <p className="empty-title">{c.emptyResearch}</p>
            <p className="empty-text">{c.emptyResearchText}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-2.5">{c.statuteMap}</h2>
        {statutes.length ? (
          <ul className="list">
            {statutes.map((s, i) => (
              <li key={`${s.name}-${i}`}>
                <button type="button" className="list-row" onClick={() => onOpen(`stat:${i}`)}>
                  <span className="list-main">
                    <span className="list-title block">{s.name}</span>
                    {s.sections ? <span className="list-meta mono">{s.sections}</span> : null}
                  </span>
                  <ChevronRight className="size-4 text-subtle" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{c.emptyStatutes}</p>
        )}
      </section>
    </div>
  );
}

function TimelineTab({ bundle, lang, onOpen }: { bundle: MatterBundle; lang: OutputLang; onOpen: (id: string) => void }) {
  const c = p(lang);
  if (bundle.timeline.length === 0) return <p className="text-sm text-muted">{c.emptyTimeline}</p>;
  return (
    <ol className="list max-w-3xl">
      {bundle.timeline.map((e) => {
        const related = relatedIdForEvent(e, bundle);
        return (
          <li key={e.id} className="flex items-start gap-2 pr-2">
            <button type="button" className="timeline-item min-w-0 flex-1" onClick={() => onOpen(e.id)}>
              <time className="tabular-nums">{formatDay(e.happenedOn, lang)}</time>
              <span className="min-w-0">
                <span className="list-title block">{e.title}</span>
                {e.detail ? <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{e.detail}</span> : null}
                <span className="mt-1.5 flex flex-wrap items-center gap-2">
                  <TrustChip origin={e.origin} lang={lang} />
                </span>
              </span>
            </button>
            {related && related !== e.id ? (
              <Button variant="ghost" size="sm" className="mt-2.5" onClick={() => onOpen(related)}>
                {c.openLinked}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function NewHearingForm({ lang, onSubmit }: { lang: OutputLang; onSubmit: (form: { listedOn: string; listedAt: string; purpose: string; courtRoom: string }) => Promise<void> }) {
  const c = p(lang);
  const [form, setForm] = useState({ listedOn: "", listedAt: "", purpose: "", courtRoom: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.listedOn) {
          setError(lang === "hi" ? "तारीख चुनें।" : "Pick the date.");
          return;
        }
        setBusy(true);
        void onSubmit(form).finally(() => setBusy(false));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="nh-date">{c.date}</Label>
          <Input id="nh-date" type="date" value={form.listedOn} aria-invalid={error ? true : undefined} onChange={(e) => (setForm({ ...form, listedOn: e.target.value }), setError(""))} />
          {error ? <p className="field-error">{error}</p> : null}
        </Field>
        <Field>
          <Label htmlFor="nh-time">{c.listedAt}</Label>
          <Input id="nh-time" value={form.listedAt} placeholder="10:30" onChange={(e) => setForm({ ...form, listedAt: e.target.value })} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="nh-purpose">{c.purpose}</Label>
        <Input
          id="nh-purpose"
          value={form.purpose}
          placeholder={lang === "hi" ? "जैसे: बहस, साक्ष्य, जवाब दाखिल" : "e.g. Arguments, evidence, reply to be filed"}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        />
      </Field>
      <Field>
        <Label htmlFor="nh-room">{c.courtroom}</Label>
        <Input id="nh-room" value={form.courtRoom} onChange={(e) => setForm({ ...form, courtRoom: e.target.value })} />
      </Field>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.addHearing}
        </Button>
      </div>
    </form>
  );
}

function NewPaperForm({ lang, matterId, onSaved }: { lang: OutputLang; matterId: string; onSaved: () => Promise<void> }) {
  const c = p(lang);
  const navigate = useNavigate();
  const [paper, setPaper] = useState({ title: "", kind: "order", body: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPaste(e: FormEvent) {
    e.preventDefault();
    if (paper.body.trim().length < 20) {
      setError(lang === "hi" ? "कम से कम कुछ पंक्तियाँ चिपकाएँ।" : "Paste at least a few lines.");
      return;
    }
    setBusy(true);
    try {
      const saved = await savePastedDocument({
        data: { matterId, title: paper.title.trim() || kindLabel(lang, paper.kind), body: paper.body.trim(), kind: paper.kind, sourceKind: "paste" },
      });
      toast.success(saved?.duplicate ? c.alreadyOnFile : c.paperSaved);
      await onSaved();
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(list: FileList | null) {
    const files = [...(list ?? [])].slice(0, 3);
    if (!files.length) return;
    setBusy(true);
    try {
      const extracted = await extractUploads({
        data: { files: await Promise.all(files.map(async (f) => ({ name: f.name, mime: f.type, base64: await fileToBase64(f) }))) },
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
      let saved = 0;
      for (const part of extracted.parts ?? []) {
        const text = String(part.text || "").trim();
        if (text.length < 20) continue;
        const row = await savePastedDocument({
          data: { matterId, title: String(part.name || paper.kind).slice(0, 240), body: text.slice(0, 40000), kind: paper.kind, sourceKind: "upload" },
        });
        if (!row?.duplicate) saved += 1;
      }
      if (!saved) toast.error(c.parseErr);
      else {
        toast.success(c.paperSaved);
        await onSaved();
      }
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onPaste}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field>
          <Label htmlFor="np-title">{c.paperTitle}</Label>
          <Input id="np-title" value={paper.title} onChange={(e) => setPaper({ ...paper, title: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="np-kind">{c.paperKind}</Label>
          <Select id="np-kind" value={paper.kind} onChange={(e) => setPaper({ ...paper, kind: e.target.value })}>
            {(["order", "pleading", "notice", "evidence", "other"] as const).map((k) => (
              <option key={k} value={k}>
                {kindLabel(lang, k)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field>
        <Label htmlFor="np-body">{c.paperBody}</Label>
        <Textarea
          id="np-body"
          className="min-h-48"
          value={paper.body}
          placeholder={c.paperBodyPlaceholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => (setPaper({ ...paper, body: e.target.value }), setError(""))}
        />
        {error ? <p className="field-error">{error}</p> : null}
      </Field>
      <label className="dropzone">
        <Paperclip className="size-4" aria-hidden />
        {busy ? c.uploadingPapers : c.uploadPaper}
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <Hint>{c.uploadHint}</Hint>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.addPaper}
        </Button>
      </div>
    </form>
  );
}

function BriefView({ brief, lang, matterId, onSaved }: { brief: Brief; lang: OutputLang; matterId: string; onSaved: () => void }) {
  const c = p(lang);
  const [saving, setSaving] = useState(false);
  const hi = lang === "hi";
  const rows: Array<[string, string | string[]]> = [
    [c.purpose, brief.purpose],
    [c.lastOrder, brief.lastOrder],
    [hi ? "पिछली पेशी" : "Last hearing", brief.lastHearing],
    [c.courtDirected, brief.courtDirected],
    [hi ? "हमारा पक्ष" : "Our position", brief.ourPosition],
    [hi ? "विरोधी पक्ष" : "Their position", brief.opponentPosition],
    [hi ? "संभावित मुद्दे" : "Likely issues", brief.issues],
    [hi ? "देखने योग्य कागज़" : "Papers to have ready", brief.documentsToReview],
    [hi ? "फ़ाइल पर नज़ीरें" : "Authorities on file", brief.authorities],
    [hi ? "बाकी काम" : "Open items", brief.openItems],
    [hi ? "आगे क्या" : "What to expect", brief.expectedNext],
    [c.caveats, brief.caveats],
  ];
  const text = rows
    .filter(([, v]) => (Array.isArray(v) ? v.length : String(v ?? "").trim()))
    .map(([k, v]) => `${k}\n${Array.isArray(v) ? v.map((x) => `- ${x}`).join("\n") : v}`)
    .join("\n\n");
  return (
    <div className="flex flex-col gap-4">
      <div className="paper px-5 py-5">
        <dl className="doc flex flex-col gap-4 !text-[0.9375rem]">
          {rows.map(([k, v]) =>
            (Array.isArray(v) ? v.length : String(v ?? "").trim()) ? (
              <div key={k}>
                <dt className="font-sans text-xs font-medium text-paper-muted">{k}</dt>
                <dd className="mt-1 leading-relaxed">
                  {Array.isArray(v) ? (
                    <ul className="flex list-disc flex-col gap-1 pl-4">
                      {v.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            toast.success(c.copied);
          }}
        >
          <Copy className="size-3.5" aria-hidden />
          {c.copyDoc}
        </Button>
        <Button
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await attachDraftToMatter({ data: { matterId, title: c.hearingBrief, kind: "other", body: text } });
              toast.success(c.paperSaved);
              refreshCounts();
              onSaved();
            } catch {
              toast.error(c.parseErr);
            } finally {
              setSaving(false);
            }
          }}
        >
          <FilePlus2 className="size-3.5" aria-hidden />
          {c.saveAsPaper}
        </Button>
      </div>
    </div>
  );
}
