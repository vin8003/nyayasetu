// @ts-nocheck
import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StagePanel } from "@/components/stage-panel";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  DeadlineBody,
  DocumentBody,
  EventBody,
  HearingBody,
  MatterSheet,
  OrderBody,
  RecordButton,
  TaskBody,
  matterRowClass,
} from "@/components/matter-record";
import { p } from "@/lib/practice/copy";
import { addHearing, addTask, clearSampleChamber, getMatterBundle, recordHearing, setMatterStage, setTaskStatus } from "@/lib/practice/store";
import { proceedingDef } from "@/lib/practice/workflow";
import { findInBundle, lastOrderId, nextHearingId, relatedIdForEvent } from "@/lib/practice/record-links";
import { useChamberLang } from "@/lib/practice/use-lang";
import { prepareHearingBrief } from "@/lib/practice/hearing-brief";
import { intakeFromMatter } from "@/lib/practice/intake-from-matter";
import { isSampleTitle } from "@/lib/practice/sample";
import { DRAFT_KEY } from "@/lib/research/draft";

export const Route = createFileRoute("/matters/$id")({ component: MatterDetailPage });

export function MatterDetailPage() {
  const { id } = Route.useParams();
  const { lang, onLang } = useChamberLang();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefing, setBriefing] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [hearingForm, setHearingForm] = useState({ listedOn: "", listedAt: "", purpose: "", courtRoom: "" });
  const [record, setRecord] = useState({ hearingId: "", outcome: "", courtSaid: "", nextDate: "" });
  const [taskTitle, setTaskTitle] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const [exiting, setExiting] = useState(false);
  const c = p(lang);

  async function reload() {
    try {
      const next = await getMatterBundle({ data: id });
      if (!next) {
        navigate({ to: "/matters" });
        return;
      }
      setBundle(next);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    reload();
  }, [id]);

  function applyHash(hash) {
    const hid = (hash || "").replace(/^#/, "");
    if (!hid || !bundle) return;
    setOpenId(findInBundle(bundle, hid) ? hid : null);
    window.setTimeout(() => document.getElementById(hid)?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  }

  useEffect(() => {
    if (!bundle) return;
    applyHash(window.location.hash);
  }, [bundle]);

  function openRecord(recordId) {
    if (!recordId) return;
    history.replaceState(null, "", `#${recordId}`);
    setOpenId(findInBundle(bundle, recordId) ? recordId : null);
    window.setTimeout(() => document.getElementById(recordId)?.scrollIntoView({ behavior: "smooth", block: "center" }), 20);
  }

  function closeRecord() {
    setOpenId(null);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  if (!bundle) {
    return (
      <AppShell lang={lang} onLang={onLang} active="matters">
        <div className="h-40 animate-pulse rounded-xl bg-elevated" />
      </AppShell>
    );
  }

  const { matter } = bundle;
  const proc = proceedingDef(matter.proceeding);
  const located = findInBundle(bundle, openId);
  const sheet = sheetContent(bundle, located, lang, c);

  async function onStage(stage) {
    await setMatterStage({ data: { matterId: matter.id, stage } });
    await reload();
  }
  async function onAddHearing(e) {
    e.preventDefault();
    if (!hearingForm.listedOn) return;
    await addHearing({
      data: {
        matterId: matter.id,
        listedOn: hearingForm.listedOn,
        listedAt: hearingForm.listedAt,
        purpose: hearingForm.purpose,
        courtRoom: hearingForm.courtRoom,
      },
    });
    setHearingForm({ listedOn: "", listedAt: "", purpose: "", courtRoom: "" });
    await reload();
  }
  async function onRecord(e) {
    e.preventDefault();
    if (!record.hearingId) return;
    await recordHearing({
      data: {
        hearingId: record.hearingId,
        outcome: record.outcome,
        courtSaid: record.courtSaid,
        nextDate: record.nextDate,
      },
    });
    setRecord({ hearingId: "", outcome: "", courtSaid: "", nextDate: "" });
    await reload();
  }
  async function onTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await addTask({ data: { matterId: matter.id, title: taskTitle.trim() } });
    setTaskTitle("");
    await reload();
  }
  async function onBrief() {
    setBriefing(true);
    try {
      const result = await prepareHearingBrief({ data: matter.id });
      if (!result.ok) {
        if (result.error === "PAYWALL") {
          toast.error(c.paywall);
          navigate({ to: "/billing" });
          return;
        }
        toast.error(c.failedAi);
        return;
      }
      setBrief(result.brief);
    } finally {
      setBriefing(false);
    }
  }
  async function onExitSample() {
    setExiting(true);
    try {
      await clearSampleChamber();
      toast.success(c.clearedSample);
      navigate({ to: "/" });
    } catch {
      toast.error(c.sampleErr);
    } finally {
      setExiting(false);
    }
  }

  const jumps = [
    ["notes", c.jumpNotes],
    ["hearings", c.diary],
    ["documents", c.documents],
    ["orders", c.orders],
    ["tasks", c.tasks],
    ["deadlines", c.deadlines],
    ["timeline", c.timeline],
  ];

  return (
    <AppShell lang={lang} onLang={onLang} active="matters">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/matters" className="text-sm text-muted hover:text-fg">
            {c.back}
          </Link>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">{matter.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {matter.courtName} {matter.caseNumber} {matter.cnr}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSampleTitle(matter.title) ? (
            confirmExit ? (
              <>
                <Button variant="outline" type="button" onClick={() => setConfirmExit(false)} disabled={exiting}>
                  {c.clearSampleNo}
                </Button>
                <Button variant="danger" type="button" onClick={() => void onExitSample()} disabled={exiting}>
                  {c.clearSampleYes}
                </Button>
              </>
            ) : (
              <Button variant="outline" type="button" onClick={() => setConfirmExit(true)} disabled={exiting}>
                {c.clearSample}
              </Button>
            )
          ) : null}
          <Button variant="outline" onClick={() => void onBrief()} disabled={briefing}>
            {briefing ? c.briefing : c.prepareBrief}
          </Button>
          <Button asChild variant="paper">
            <Link
              to="/research"
              search={{ matter: matter.id }}
              onClick={() => {
                try {
                  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ intake: intakeFromMatter(bundle, lang), lang }));
                } catch {}
              }}
            >
              {c.attachResearch}
            </Link>
          </Button>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {jumps.map(([hid, label]) => (
          <a
            key={hid}
            href={`#${hid}`}
            className="rounded-full bg-elevated px-3 py-1.5 text-xs text-muted hover:text-fg"
            onClick={(e) => {
              e.preventDefault();
              openRecord(hid);
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <section className="grid gap-3 sm:grid-cols-3">
            <Field>
              <Label htmlFor="st">{c.stage}</Label>
              <Select id="st" value={matter.stage} onChange={(e) => void onStage(e.target.value)}>
                {proc.stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === "hi" ? s.labelHi : s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <button type="button" className={matterRowClass} onClick={() => openRecord(nextHearingId(bundle))}>
              <div className="text-xs text-muted">{c.nextHearing}</div>
              <div className="mt-1 font-medium tabular-nums">{matter.nextHearingOn ?? "—"}</div>
            </button>
            <button type="button" className={matterRowClass} onClick={() => openRecord(lastOrderId(bundle))}>
              <div className="text-xs text-muted">{c.lastOrder}</div>
              <div className="mt-1 font-medium tabular-nums">{matter.lastOrderOn ?? "—"}</div>
            </button>
          </section>

          {matter.parties?.length ? (
            <section>
              <h2 className="font-display text-2xl">{c.parties}</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {matter.parties.map((party, i) => (
                  <li key={i} className="text-muted">
                    <span className="text-fg">{party.role}</span> — {party.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {matter.notes?.trim() ? (
            <section className="scroll-mt-20">
              <h2 className="font-display text-2xl">{c.notes}</h2>
              <RecordButton id="notes" active={openId === "notes"} onOpen={openRecord} className="mt-3">
                <div className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">{matter.notes}</div>
              </RecordButton>
            </section>
          ) : null}

          {brief ? (
            <section className="rounded-xl bg-paper p-5 text-paper-ink shadow-paper">
              <h2 className="font-display text-2xl">{c.hearingBrief}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  [c.purpose, brief.purpose],
                  [c.lastOrder, brief.lastOrder],
                  [c.courtDirected, brief.courtDirected],
                  [c.outcome, brief.lastHearing],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-xs uppercase tracking-wide text-paper-muted">{k}</dt>
                    <dd className="mt-1 leading-relaxed">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section id="hearings" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.diary}</h2>
            {bundle.hearings.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{c.emptyHearings}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bundle.hearings.map((h) => (
                  <li key={h.id}>
                    <RecordButton id={h.id} active={openId === h.id} onOpen={openRecord}>
                      <div className="font-medium tabular-nums">
                        {h.listedOn} {h.listedAt}
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        {h.purpose} {h.outcome ? `· ${h.outcome}` : ""}
                      </div>
                    </RecordButton>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={onAddHearing} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field>
                <Label htmlFor="ld">{c.date}</Label>
                <Input
                  id="ld"
                  type="date"
                  value={hearingForm.listedOn}
                  onChange={(e) => setHearingForm({ ...hearingForm, listedOn: e.target.value })}
                />
              </Field>
              <Field>
                <Label htmlFor="lt">{c.time}</Label>
                <Input
                  id="lt"
                  value={hearingForm.listedAt}
                  onChange={(e) => setHearingForm({ ...hearingForm, listedAt: e.target.value })}
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="lp">{c.purpose}</Label>
                <Input
                  id="lp"
                  value={hearingForm.purpose}
                  onChange={(e) => setHearingForm({ ...hearingForm, purpose: e.target.value })}
                />
              </Field>
              <Button type="submit">{c.addHearing}</Button>
            </form>
            {bundle.hearings.length > 0 ? (
              <form onSubmit={onRecord} className="mt-6 space-y-3 rounded-lg bg-elevated p-4">
                <h3 className="text-sm font-medium">{c.recordHearing}</h3>
                <Select value={record.hearingId} onChange={(e) => setRecord({ ...record, hearingId: e.target.value })}>
                  <option value="">{c.date}</option>
                  {bundle.hearings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.listedOn} {h.purpose}
                    </option>
                  ))}
                </Select>
                <Textarea
                  className="min-h-24"
                  placeholder={c.outcome}
                  value={record.outcome}
                  onChange={(e) => setRecord({ ...record, outcome: e.target.value })}
                />
                <Textarea
                  className="min-h-24"
                  placeholder={c.whatCourtSaid}
                  value={record.courtSaid}
                  onChange={(e) => setRecord({ ...record, courtSaid: e.target.value })}
                />
                <Field>
                  <Label htmlFor="nd">{c.nextDate}</Label>
                  <Input
                    id="nd"
                    type="date"
                    value={record.nextDate}
                    onChange={(e) => setRecord({ ...record, nextDate: e.target.value })}
                  />
                </Field>
                <Button type="submit">{c.recordHearing}</Button>
              </form>
            ) : null}
          </section>

          <section id="documents" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.documents}</h2>
            {bundle.documents.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{c.emptyDocs}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bundle.documents.map((d) => (
                  <li key={d.id}>
                    <RecordButton id={d.id} active={openId === d.id} onOpen={openRecord}>
                      <div className="text-sm font-medium">{d.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-wide text-muted">{d.kind}</div>
                    </RecordButton>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="orders" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.orders}</h2>
            {bundle.orders.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{c.emptyOrders}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {bundle.orders.map((o) => (
                  <li key={o.id}>
                    <RecordButton id={o.id} active={openId === o.id} onOpen={openRecord}>
                      <div className="text-sm font-medium tabular-nums">{o.orderDate || c.orders}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted">{o.body}</div>
                    </RecordButton>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="tasks" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.tasks}</h2>
            <ul className="mt-3 space-y-2">
              {bundle.tasks.map((t) => (
                <li key={t.id} className="flex items-stretch gap-2">
                  <RecordButton id={t.id} active={openId === t.id} onOpen={openRecord} className="min-w-0 flex-1">
                    <div className={t.status === "done" ? "text-sm text-muted line-through" : "text-sm font-medium"}>
                      {t.title}
                    </div>
                    <div className="mt-1">
                      <TrustChip origin={t.origin} lang={lang} />
                    </div>
                  </RecordButton>
                  {t.status === "open" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-center"
                      onClick={() => void setTaskStatus({ data: { id: t.id, status: "done" } }).then(reload)}
                    >
                      {c.markDone}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <form onSubmit={onTask} className="mt-3 flex gap-2">
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={c.taskTitle} />
              <Button type="submit">{c.addTask}</Button>
            </form>
          </section>

          <section id="deadlines" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.deadlines}</h2>
            <ul className="mt-3 space-y-2">
              {bundle.deadlines.map((d) => (
                <li key={d.id}>
                  <RecordButton id={d.id} active={openId === d.id} onOpen={openRecord}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{d.title}</div>
                        <div className="mt-1 tabular-nums text-xs text-muted">{d.dueOn}</div>
                      </div>
                      <TrustChip origin={d.origin} lang={lang} />
                    </div>
                  </RecordButton>
                </li>
              ))}
            </ul>
          </section>

          <section id="timeline" className="scroll-mt-20">
            <h2 className="font-display text-2xl">{c.timeline}</h2>
            <ol className="mt-3 space-y-2">
              {bundle.timeline.map((e) => {
                const related = relatedIdForEvent(e, bundle);
                const target = related || e.id;
                return (
                  <li key={e.id}>
                    <RecordButton id={e.id} active={openId === e.id || openId === related} onOpen={() => openRecord(target)}>
                      <div className="text-xs tabular-nums text-accent">{e.happenedOn}</div>
                      <div className="mt-1 text-sm font-medium">{e.title}</div>
                      {e.detail ? <div className="mt-1 line-clamp-3 text-sm text-muted">{e.detail}</div> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <TrustChip origin={e.origin} lang={lang} />
                        {related ? <span className="text-[11px] uppercase tracking-wide text-accent">{c.openLinked}</span> : null}
                      </div>
                    </RecordButton>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        <StagePanel lang={lang} proceeding={matter.proceeding} stage={matter.stage} />
      </div>
      <p className="mt-10 text-xs leading-relaxed text-subtle">{c.trustNote}</p>
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
    </AppShell>
  );
}

function sheetContent(bundle, located, lang, c) {
  if (!located) return null;
  if (located.kind === "notes") {
    return { title: c.notes, kicker: bundle.matter.title, body: <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{bundle.matter.notes}</pre> };
  }
  if (located.kind === "hearing") {
    const h = bundle.hearings.find((x) => x.id === located.id);
    if (!h) return null;
    const linkedOrder = bundle.orders.find((o) => o.orderDate === h.listedOn);
    return {
      title: h.purpose || c.diary,
      kicker: `${h.listedOn} ${h.listedAt || ""}`,
      body: <HearingBody h={h} lang={lang} />,
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
      kicker: c.documents,
      body: <DocumentBody d={d} />,
      linkedId: linkedOrder?.id,
      linkedLabel: linkedOrder ? c.orders : null,
    };
  }
  if (located.kind === "order") {
    const o = bundle.orders.find((x) => x.id === located.id);
    if (!o) return null;
    return {
      title: c.orders,
      kicker: o.orderDate || "",
      body: <OrderBody o={o} lang={lang} />,
      linkedId: o.documentId,
      linkedLabel: o.documentId ? c.documents : null,
    };
  }
  if (located.kind === "task") {
    const t = bundle.tasks.find((x) => x.id === located.id);
    if (!t) return null;
    return { title: t.title, kicker: c.tasks, body: <TaskBody t={t} lang={lang} /> };
  }
  if (located.kind === "deadline") {
    const d = bundle.deadlines.find((x) => x.id === located.id);
    if (!d) return null;
    return { title: d.title, kicker: c.deadlines, body: <DeadlineBody d={d} lang={lang} /> };
  }
  if (located.kind === "event") {
    const e = bundle.timeline.find((x) => x.id === located.id);
    if (!e) return null;
    const related = relatedIdForEvent(e, bundle);
    return {
      title: e.title,
      kicker: c.timeline,
      body: <EventBody e={e} lang={lang} />,
      linkedId: related && related !== e.id ? related : null,
      linkedLabel: related && related !== e.id ? c.openLinked : null,
    };
  }
  return null;
}
