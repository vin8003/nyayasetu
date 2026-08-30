// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
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
  MatterFileBody,
  MatterSheet,
  MemoFileBody,
  OrderBody,
  RecordButton,
  StatuteFileBody,
  TaskBody,
  matterRowClass,
} from "@/components/matter-record";
import { p } from "@/lib/practice/copy";
import { addHearing, addTask, clearSampleChamber, getMatterBundle, recordHearing, savePastedDocument, setMatterStage, setTaskStatus, updateDocument, updateEvent, updateHearing, updateMatter, updateOrder, updateWorkItem } from "@/lib/practice/store";
import { proceedingDef } from "@/lib/practice/workflow";
import { findInBundle, lastOrderId, nextHearingId, relatedIdForEvent } from "@/lib/practice/record-links";
import { useChamberLang } from "@/lib/practice/use-lang";
import { prepareHearingBrief } from "@/lib/practice/hearing-brief";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";
import { draftForWork } from "@/lib/practice/task-draft";
import { listMemos } from "@/lib/research/store";
import { statutesFromMemos } from "@/lib/practice/statute-map";
import { intakeFromMatter } from "@/lib/practice/intake-from-matter";
import { isSampleTitle } from "@/lib/practice/sample-ids";
import { DRAFT_KEY } from "@/lib/research/draft";
import { extractUploads } from "@/lib/research/files";
import { fileToBase64 } from "@/lib/read-file";
import { writeInboxDraft } from "@/lib/practice/inbox-draft";

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
  const [draftingId, setDraftingId] = useState("");
  const [workDrafts, setWorkDrafts] = useState({});
  const [fileMemos, setFileMemos] = useState([]);
  const [paper, setPaper] = useState({ title: "", kind: "order", body: "" });
  const [paperBusy, setPaperBusy] = useState(false);
  const c = p(lang);

  const landedOnHash = useRef(false);

  async function reload() {
    try {
      const [next, memos] = await Promise.all([
        getMatterBundle({ data: id }),
        listMemos({ data: { matterId: id } }).catch(() => []),
      ]);
      if (!next) {
        navigate({ to: "/matters" });
        return;
      }
      setBundle(next);
      setFileMemos(memos);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
    }
  }

  useEffect(() => {
    landedOnHash.current = Boolean(window.location.hash);
    reload();
  }, [id]);

  function isExtraRecord(recordId) {
    return typeof recordId === "string" && (recordId.startsWith("memo:") || recordId.startsWith("stat:") || recordId === "file");
  }

  function applyHash(hash) {
    const hid = (hash || "").replace(/^#/, "");
    if (!hid || !bundle) return;
    setOpenId(findInBundle(bundle, hid) || isExtraRecord(hid) ? hid : null);
  }

  useEffect(() => {
    if (!bundle) return;
    applyHash(window.location.hash);
  }, [bundle]);

  function openRecord(recordId) {
    if (!recordId) return;
    setOpenId(findInBundle(bundle, recordId) || isExtraRecord(recordId) ? recordId : null);
  }

  function closeRecord() {
    if (landedOnHash.current && window.history.length > 1) {
      landedOnHash.current = false;
      window.history.back();
      return;
    }
    setOpenId(null);
  }

  if (!bundle) {
    return (
      <AppShell lang={lang} onLang={onLang} active="matters">
        <div className="skeleton h-40" />
      </AppShell>
    );
  }

  const { matter } = bundle;
  const proc = proceedingDef(matter.proceeding);
  const located = findInBundle(bundle, openId);

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
  async function onPastePaper(e) {
    e.preventDefault();
    if (paper.body.trim().length < 20) {
      toast.error(c.parseErr);
      return;
    }
    setPaperBusy(true);
    try {
      await savePastedDocument({
        data: {
          matterId: matter.id,
          title: paper.title.trim() || paper.kind,
          body: paper.body.trim(),
          kind: paper.kind,
          sourceKind: "paste",
        },
      });
      setPaper({ title: "", kind: paper.kind, body: "" });
      toast.success(c.paperSaved);
      await reload();
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setPaperBusy(false);
    }
  }
  async function onUploadPaper(list) {
    const files = [...(list ?? [])].slice(0, 3);
    if (!files.length) return;
    setPaperBusy(true);
    try {
      const extracted = await extractUploads({
        data: {
          files: await Promise.all(
            files.map(async (f) => ({ name: f.name, mime: f.type, base64: await fileToBase64(f) })),
          ),
        },
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
        await savePastedDocument({
          data: {
            matterId: matter.id,
            title: String(part.name || paper.kind).slice(0, 240),
            body: text.slice(0, 40000),
            kind: paper.kind,
            sourceKind: "upload",
          },
        });
        saved += 1;
      }
      if (!saved) toast.error(c.parseErr);
      else toast.success(c.paperSaved);
      await reload();
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setPaperBusy(false);
    }
  }
  async function onDraftWork(itemKind, itemId) {
    setDraftingId(itemId);
    try {
      const result = await draftForWork({ data: { matterId: matter.id, itemId, itemKind, lang } });
      if (!result.ok) {
        if (result.error === "PAYWALL") {
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
      setWorkDrafts((prev) => ({ ...prev, [itemId]: result.body }));
      toast.success(c.draftSaved);
      await reload();
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.failedAi);
    } finally {
      setDraftingId("");
    }
  }
  async function persist(run) {
    try {
      const result = await run();
      if (result && result.ok === false) {
        toast.error(c.parseErr);
        return;
      }
      toast.success(c.savedEntry);
      await reload();
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    }
  }
  const sheetBase = sheetContent(bundle, located, lang, c, {
    draftingId,
    workDrafts,
    onDraftWork,
    onMarkDone: (itemId) => void setTaskStatus({ data: { id: itemId, status: "done" } }).then(reload),
    navigate,
    onSaveMatter: (patch) =>
      persist(() =>
        updateMatter({
          data: { id: bundle.matter.id, ...patch },
        }),
      ),
    onSaveHearing: (id, patch) => persist(() => updateHearing({ data: { id, ...patch } })),
    onSaveDocument: (id, patch) => persist(() => updateDocument({ data: { id, ...patch } })),
    onSaveOrder: (id, patch) => persist(() => updateOrder({ data: { id, ...patch } })),
    onSaveWork: (kind, id, patch) => persist(() => updateWorkItem({ data: { id, kind, ...patch } })),
    onSaveEvent: (id, patch) => persist(() => updateEvent({ data: { id, ...patch } })),
  });
  const statutes = statutesFromMemos(fileMemos);
  const sheet = extraSheet(sheetBase, openId, fileMemos, statutes, lang, c, navigate);
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
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.failedAi);
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
    ["research-file", c.researchOnFile],
    ["statutes", c.statuteMap],
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
          <Link to="/matters" className="sheet-back -ms-2">
            <ChevronLeft className="size-5 shrink-0" aria-hidden />
            {c.matters}
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
          <Button variant="outline" onClick={() => openRecord("file")}>
            {c.editFile}
          </Button>
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
              <h2 className="section-title">{c.parties}</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {matter.parties.map((party, i) => (
                  <li key={i} className="text-muted">
                    <span className="text-fg">{party.role}</span> — {party.name}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="scroll-mt-20">
            <h2 className="section-title">{c.notes}</h2>
            <RecordButton id="notes" active={openId === "notes"} onOpen={openRecord} className="mt-3">
              <div className="line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {matter.notes?.trim() ? matter.notes : c.emptyNotes}
              </div>
            </RecordButton>
          </section>

          <section id="research-file" className="scroll-mt-20">
            <h2 className="section-title">{c.researchOnFile}</h2>
            {fileMemos.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{c.emptyResearch}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {fileMemos.map((item) => (
                  <li key={item.id}>
                    <RecordButton
                      id={`memo:${item.id}`}
                      active={openId === `memo:${item.id}`}
                      onOpen={openRecord}
                    >
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="mt-1 text-xs text-muted">{String(item.createdAt || "").slice(0, 10)}</div>
                    </RecordButton>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="statutes" className="scroll-mt-20">
            <h2 className="section-title">{c.statuteMap}</h2>
            {statutes.length === 0 ? (
              <p className="mt-3 text-sm text-muted">{c.emptyStatutes}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {statutes.map((s, i) => {
                  const sid = `stat:${i}`;
                  return (
                    <li key={sid}>
                      <RecordButton id={sid} active={openId === sid} onOpen={openRecord}>
                        <div className="text-sm font-medium">{s.name}</div>
                        {s.sections ? <div className="mt-1 text-xs text-muted">{s.sections}</div> : null}
                      </RecordButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {brief ? (
            <section className="rounded-xl bg-paper p-5 text-paper-ink shadow-paper">
              <h2 className="section-title">{c.hearingBrief}</h2>
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
            <h2 className="section-title">{c.diary}</h2>
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
            <h2 className="section-title">{c.documents}</h2>
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
            <form onSubmit={onPastePaper} className="mt-4 space-y-3 rounded-lg bg-elevated p-4">
              <h3 className="text-sm font-medium">{c.addPaper}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="pt">{c.paperTitle}</Label>
                  <Input
                    id="pt"
                    value={paper.title}
                    onChange={(e) => setPaper({ ...paper, title: e.target.value })}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pk">{c.documents}</Label>
                  <Select
                    id="pk"
                    value={paper.kind}
                    onChange={(e) => setPaper({ ...paper, kind: e.target.value })}
                  >
                    <option value="order">{c.kindOrder}</option>
                    <option value="pleading">{c.kindPleading}</option>
                    <option value="evidence">{c.kindEvidence}</option>
                    <option value="notice">{c.kindNotice}</option>
                    <option value="other">{c.kindOther}</option>
                  </Select>
                </Field>
              </div>
              <Textarea
                className="min-h-28"
                placeholder={c.pasteOrder}
                value={paper.body}
                onChange={(e) => setPaper({ ...paper, body: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={paperBusy}>
                  {paperBusy ? c.uploadingPapers : c.addPaper}
                </Button>
                <label className="inline-flex h-10 cursor-pointer items-center rounded-md px-3 text-sm text-muted hover:text-fg">
                  {c.uploadPaper}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    multiple
                    onChange={(e) => {
                      void onUploadPaper(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </form>
          </section>

          <section id="orders" className="scroll-mt-20">
            <h2 className="section-title">{c.orders}</h2>
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
            <h2 className="section-title">{c.tasks}</h2>
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
                    <div className="flex flex-col justify-center gap-1">
                      {classifyTaskDraft(t.title, t.sourceQuote).draftable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="self-center"
                          onClick={() => {
                            openRecord(t.id);
                            void onDraftWork("task", t.id);
                          }}
                        >
                          {c.draftForTask}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-center"
                        onClick={() => void setTaskStatus({ data: { id: t.id, status: "done" } }).then(reload)}
                      >
                        {c.markDone}
                      </Button>
                    </div>
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
            <h2 className="section-title">{c.deadlines}</h2>
            <ul className="mt-3 space-y-2">
              {bundle.deadlines.map((d) => (
                <li key={d.id} className="flex items-stretch gap-2">
                  <RecordButton id={d.id} active={openId === d.id} onOpen={openRecord} className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{d.title}</div>
                        <div className="mt-1 tabular-nums text-xs text-muted">{d.dueOn}</div>
                      </div>
                      <TrustChip origin={d.origin} lang={lang} />
                    </div>
                  </RecordButton>
                  {d.status === "open" ? (
                    <div className="flex flex-col justify-center gap-1">
                      {classifyTaskDraft(d.title, d.sourceQuote).draftable ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="self-center"
                          onClick={() => {
                            openRecord(d.id);
                            void onDraftWork("deadline", d.id);
                          }}
                        >
                          {c.draftForTask}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-center"
                        onClick={() => void setTaskStatus({ data: { id: d.id, status: "done" } }).then(reload)}
                      >
                        {c.markDone}
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section id="timeline" className="scroll-mt-20">
            <h2 className="section-title">{c.timeline}</h2>
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

function sheetContent(bundle, located, lang, c, work = {}) {
  const {
    draftingId = "",
    workDrafts = {},
    onDraftWork,
    onMarkDone,
    navigate,
    onSaveMatter,
    onSaveHearing,
    onSaveDocument,
    onSaveOrder,
    onSaveWork,
    onSaveEvent,
  } = work;
  if (!located) return null;
  if (located.kind === "notes" || located.kind === "file") {
    return {
      title: c.editFile,
      kicker: bundle.matter.title,
      body: <MatterFileBody matter={bundle.matter} lang={lang} onSave={onSaveMatter} />,
    };
  }
  if (located.kind === "hearing") {
    const h = bundle.hearings.find((x) => x.id === located.id);
    if (!h) return null;
    const linkedOrder = bundle.orders.find((o) => o.orderDate === h.listedOn);
    return {
      title: h.purpose || c.diary,
      kicker: `${h.listedOn} ${h.listedAt || ""}`,
      body: (
        <HearingBody
          h={h}
          lang={lang}
          onSave={(patch) => onSaveHearing?.(h.id, patch)}
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
      kicker: c.documents,
      body: (
        <DocumentBody
          d={d}
          lang={lang}
          onSave={(patch) => onSaveDocument?.(d.id, patch)}
          onReadOrder={() => {
            writeInboxDraft({ matterId: bundle.matter.id, body: d.text, title: d.title });
            navigate?.({ to: "/inbox", search: { matter: bundle.matter.id } });
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
      title: c.orders,
      kicker: o.orderDate || "",
      body: <OrderBody o={o} lang={lang} onSave={(patch) => onSaveOrder?.(o.id, patch)} />,
      linkedId: o.documentId,
      linkedLabel: o.documentId ? c.documents : null,
    };
  }
  if (located.kind === "task") {
    const t = bundle.tasks.find((x) => x.id === located.id);
    if (!t) return null;
    return {
      title: t.title,
      kicker: c.tasks,
      body: (
        <TaskBody
          t={t}
          lang={lang}
          drafting={draftingId === t.id}
          draftText={workDrafts[t.id] || ""}
          onDraft={() => onDraftWork?.("task", t.id)}
          onMarkDone={() => onMarkDone?.(t.id)}
          onSave={(patch) => onSaveWork?.("task", t.id, patch)}
        />
      ),
    };
  }
  if (located.kind === "deadline") {
    const d = bundle.deadlines.find((x) => x.id === located.id);
    if (!d) return null;
    return {
      title: d.title,
      kicker: c.deadlines,
      body: (
        <DeadlineBody
          d={d}
          lang={lang}
          drafting={draftingId === d.id}
          draftText={workDrafts[d.id] || ""}
          onDraft={() => onDraftWork?.("deadline", d.id)}
          onMarkDone={() => onMarkDone?.(d.id)}
          onSave={(patch) => onSaveWork?.("deadline", d.id, patch)}
        />
      ),
    };
  }
  if (located.kind === "event") {
    const e = bundle.timeline.find((x) => x.id === located.id);
    if (!e) return null;
    const related = relatedIdForEvent(e, bundle);
    return {
      title: e.title,
      kicker: c.timeline,
      body: <EventBody e={e} lang={lang} onSave={(patch) => onSaveEvent?.(e.id, patch)} />,
      linkedId: related && related !== e.id ? related : null,
      linkedLabel: related && related !== e.id ? c.openLinked : null,
    };
  }
  return null;
}

function extraSheet(base, openId, fileMemos, statutes, lang, c, navigate) {
  if (base) return base;
  if (typeof openId === "string" && openId.startsWith("memo:")) {
    const item = fileMemos.find((m) => m.id === openId.slice(5));
    if (!item) return null;
    const issues = (item.memo?.issues ?? []).map((row) => row.issue).filter(Boolean);
    return {
      title: item.title,
      kicker: c.researchOnFile,
      body: (
        <MemoFileBody
          title={item.title}
          createdAt={item.createdAt}
          facts={item.memo?.factsSummary || ""}
          issues={issues}
          lang={lang}
          onOpenFull={() =>
            navigate({
              to: "/research",
              search: { matter: item.matterId || undefined, memo: item.id },
            })
          }
        />
      ),
    };
  }
  if (typeof openId === "string" && openId.startsWith("stat:")) {
    const s = statutes[Number(openId.slice(5))];
    if (!s) return null;
    return { title: s.name, kicker: c.statuteMap, body: <StatuteFileBody s={s} /> };
  }
  return null;
}

