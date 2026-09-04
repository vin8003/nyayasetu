import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { toast } from "sonner";
import { p } from "@/lib/practice/copy";
import { formatParties } from "@/lib/practice/ids";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";
import { OUR_SIDES } from "@/lib/practice/types";
import { downloadWordFile, slugFilename, textAsWordHtml } from "@/lib/research/word-file";
import type { OutputLang } from "@/lib/research/types";
import type { StatuteRef } from "@/lib/research/types";
import type {
  Deadline,
  Hearing,
  Matter,
  MatterDocument,
  MatterOrder,
  Task,
  TimelineEvent,
} from "@/lib/practice/types";

export const matterRowClass =
  "row w-full cursor-pointer text-left";

export function RecordButton({
  id,
  active,
  onOpen,
  children,
  className = "",
}: {
  id: string;
  active?: boolean;
  onOpen: (id: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      className={`${matterRowClass} scroll-mt-24 ${active ? "ring-2 ring-accent/70" : ""} ${className}`}
      onClick={() => onOpen(id)}
    >
      {children}
    </button>
  );
}

export function MatterSheet({
  open,
  title,
  kicker,
  lang,
  onClose,
  linkedLabel,
  onOpenLinked,
  children,
}: {
  open: boolean;
  title: string;
  kicker?: string;
  lang: OutputLang;
  onClose: () => void;
  linkedLabel?: string | null;
  onOpenLinked?: () => void;
  children: ReactNode;
}) {
  const c = p(lang);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.removeEventListener("keydown", onKey);
      window.scrollTo(0, y);
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="sheet">
      <button type="button" className="sheet-backdrop" aria-label={c.back} onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="sheet-panel">
        <div className="sheet-head">
          <button type="button" className="sheet-back" onClick={onClose}>
            <ChevronLeft className="size-5 shrink-0" aria-hidden />
            {c.back}
          </button>
          {kicker ? <p className="eyebrow mt-2">{kicker}</p> : null}
          <h2 id="sheet-title" className="section-title mt-1 leading-tight text-pretty">
            {title}
          </h2>
        </div>
        <div className="sheet-body">{children}</div>
        {linkedLabel && onOpenLinked ? (
          <div className="sheet-foot">
            <Button variant="outline" className="w-full" onClick={onOpenLinked}>
              {c.openLinked}: {linkedLabel}
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function HearingBody({
  h,
  lang,
  onSave,
}: {
  h: Hearing;
  lang: OutputLang;
  onSave?: (patch: {
    listedOn: string;
    listedAt: string;
    purpose: string;
    courtRoom: string;
    bench: string;
    outcome: string;
    notes: string;
    nextDate: string;
  }) => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState(() => hearingFields(h));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(hearingFields(h)), [h.id, h.listedOn, h.listedAt, h.purpose, h.courtRoom, h.bench, h.outcome, h.notes, h.nextDate]);
  if (!onSave) {
    return (
      <dl className="space-y-3 text-sm">
        <Row label={c.date} value={`${h.listedOn} ${h.listedAt || ""}`} />
        <Row label={c.courtroom} value={[h.courtRoom, h.bench].filter(Boolean).join(" · ")} />
        <Row label={c.purpose} value={h.purpose} />
        <Row label={c.stage} value={h.stage} />
        <Row label={c.outcome} value={h.outcome} />
        <Row label={c.whatCourtSaid} value={h.notes} />
        <Row label={c.nextDate} value={h.nextDate ?? ""} />
      </dl>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      <Field>
        <Label htmlFor="h-date">{c.date}</Label>
        <Input id="h-date" type="date" value={form.listedOn} onChange={(e) => setForm({ ...form, listedOn: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-time">{c.listedAt}</Label>
        <Input id="h-time" value={form.listedAt} onChange={(e) => setForm({ ...form, listedAt: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-purpose">{c.purpose}</Label>
        <Textarea
          id="h-purpose"
          className="min-h-20"
          value={form.purpose}
          onChange={(e) => setForm({ ...form, purpose: e.target.value })}
        />
      </Field>
      <Field>
        <Label htmlFor="h-room">{c.courtroom}</Label>
        <Input id="h-room" value={form.courtRoom} onChange={(e) => setForm({ ...form, courtRoom: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-bench">{c.stage}</Label>
        <Input id="h-bench" value={form.bench} onChange={(e) => setForm({ ...form, bench: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-out">{c.outcome}</Label>
        <Textarea id="h-out" className="min-h-20" value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-said">{c.whatCourtSaid}</Label>
        <Textarea id="h-said" className="min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-next">{c.nextDate}</Label>
        <Input id="h-next" type="date" value={form.nextDate} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? c.savingEntry : c.saveEntry}
      </Button>
    </form>
  );
}

function hearingFields(h: Hearing) {
  return {
    listedOn: h.listedOn || "",
    listedAt: h.listedAt || "",
    purpose: h.purpose || "",
    courtRoom: h.courtRoom || "",
    bench: h.bench || "",
    outcome: h.outcome || "",
    notes: h.notes || "",
    nextDate: h.nextDate || "",
  };
}

export function DocumentBody({
  d,
  lang,
  onReadOrder,
  onSave,
}: {
  d: MatterDocument;
  lang: OutputLang;
  onReadOrder?: () => void;
  onSave?: (patch: { title: string; body: string; kind: string }) => Promise<void>;
}) {
  const c = p(lang);
  const text = d.text || "";
  const [form, setForm] = useState({ title: d.title, body: text, kind: d.kind || "other" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ title: d.title, body: d.text || "", kind: d.kind || "other" }), [d.id, d.title, d.text, d.kind]);
  return (
    <div>
      {onSave ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void onSave(form).finally(() => setBusy(false));
          }}
        >
          <Field>
            <Label htmlFor="d-title">{c.paperTitle}</Label>
            <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field>
            <Label htmlFor="d-kind">{c.documents}</Label>
            <Select id="d-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="order">{c.kindOrder}</option>
              <option value="pleading">{c.kindPleading}</option>
              <option value="evidence">{c.kindEvidence}</option>
              <option value="notice">{c.kindNotice}</option>
              <option value="other">{c.kindOther}</option>
            </Select>
          </Field>
          <Textarea className="min-h-48" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Button type="submit" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
        </form>
      ) : (
        <>
          <div className="text-xs uppercase tracking-wide text-muted">
            {d.kind} · {d.sourceKind}
          </div>
          {d.sourceUrl ? (
            <a
              href={d.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-accent hover:underline"
            >
              {d.sourceUrl.replace(/^https?:\/\//, "").slice(0, 64)}
            </a>
          ) : null}
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">{text}</pre>
        </>
      )}
      {text.trim().length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(onSave ? form.body : text);
              toast.success(c.draftCopied);
            }}
          >
            {c.copyDoc}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              downloadWordFile(
                `${slugFilename(onSave ? form.title : d.title, "citebench-paper")}.doc`,
                textAsWordHtml(onSave ? form.title : d.title, onSave ? form.body : text),
              )
            }
          >
            {c.wordBrief}
          </Button>
          {onReadOrder && (onSave ? form.body : text).trim().length >= 40 ? (
            <Button type="button" size="sm" onClick={onReadOrder}>
              {c.readAsOrder}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OrderBody({
  o,
  lang,
  onSave,
}: {
  o: MatterOrder;
  lang: OutputLang;
  onSave?: (patch: { orderDate: string; body: string }) => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState({ orderDate: o.orderDate || "", body: o.body || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ orderDate: o.orderDate || "", body: o.body || "" }), [o.id, o.orderDate, o.body]);
  return (
    <div className="space-y-4 text-sm">
      {onSave ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void onSave(form).finally(() => setBusy(false));
          }}
        >
          <Field>
            <Label htmlFor="o-date">{c.date}</Label>
            <Input id="o-date" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </Field>
          <Textarea className="min-h-40" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Button type="submit" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
        </form>
      ) : (
        <>
          <div className="text-xs tabular-nums text-muted">
            {o.orderDate || "—"} {o.confirmed ? `· ${c.confirm}` : ""}
          </div>
          <pre className="whitespace-pre-wrap font-sans leading-relaxed text-fg/90">{o.body}</pre>
        </>
      )}
      {o.directions?.length ? (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted">{c.courtDirected}</div>
          <ul className="mt-2 space-y-2">
            {o.directions.map((d, i) => (
              <li key={i} className="rounded-md bg-elevated px-3 py-2">
                <div>{d.text}</div>
                {d.deadline ? <div className="mt-1 tabular-nums text-xs text-muted">{d.deadline}</div> : null}
                {d.quote ? <div className="mt-1 text-xs text-subtle">“{d.quote}”</div> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function TaskBody({
  t,
  lang,
  drafting = false,
  draftText = "",
  onDraft,
  onMarkDone,
  onSave,
}: {
  t: Task;
  lang: OutputLang;
  drafting?: boolean;
  draftText?: string;
  onDraft?: () => void;
  onMarkDone?: () => void;
  onSave?: (patch: { title: string; dueOn: string }) => Promise<void>;
}) {
  const c = p(lang);
  const classified = classifyTaskDraft(t.title, t.sourceQuote);
  const [form, setForm] = useState({ title: t.title, dueOn: t.dueOn || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ title: t.title, dueOn: t.dueOn || "" }), [t.id, t.title, t.dueOn]);
  return (
    <div className="space-y-3 text-sm">
      <TrustChip origin={t.origin} lang={lang} />
      {onSave ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void onSave(form).finally(() => setBusy(false));
          }}
        >
          <Field>
            <Label htmlFor="t-title">{c.taskTitle}</Label>
            <Input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field>
            <Label htmlFor="t-due">{c.due}</Label>
            <Input id="t-due" type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
        </form>
      ) : (
        <Row label={c.due} value={t.dueOn ?? ""} />
      )}
      {t.sourceQuote ? <p className="leading-relaxed text-muted">{t.sourceQuote}</p> : null}
      <WorkDraftActions
        lang={lang}
        draftable={classified.draftable}
        drafting={drafting}
        draftText={draftText}
        showDone={t.status === "open" && Boolean(onMarkDone)}
        onDraft={onDraft}
        onMarkDone={onMarkDone}
      />
    </div>
  );
}

export function DeadlineBody({
  d,
  lang,
  drafting = false,
  draftText = "",
  onDraft,
  onMarkDone,
  onSave,
}: {
  d: Deadline;
  lang: OutputLang;
  drafting?: boolean;
  draftText?: string;
  onDraft?: () => void;
  onMarkDone?: () => void;
  onSave?: (patch: { title: string; dueOn: string }) => Promise<void>;
}) {
  const c = p(lang);
  const classified = classifyTaskDraft(d.title, d.sourceQuote);
  const [form, setForm] = useState({ title: d.title, dueOn: d.dueOn || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ title: d.title, dueOn: d.dueOn || "" }), [d.id, d.title, d.dueOn]);
  return (
    <div className="space-y-3 text-sm">
      <TrustChip origin={d.origin} lang={lang} />
      {onSave ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            void onSave(form).finally(() => setBusy(false));
          }}
        >
          <Field>
            <Label htmlFor="dl-title">{c.deadlines}</Label>
            <Input id="dl-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field>
            <Label htmlFor="dl-due">{c.due}</Label>
            <Input id="dl-due" type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
        </form>
      ) : (
        <Row label={c.due} value={d.dueOn} />
      )}
      {d.sourceQuote ? <p className="leading-relaxed text-muted">{d.sourceQuote}</p> : null}
      <WorkDraftActions
        lang={lang}
        draftable={classified.draftable}
        drafting={drafting}
        draftText={draftText}
        showDone={d.status === "open" && Boolean(onMarkDone)}
        onDraft={onDraft}
        onMarkDone={onMarkDone}
      />
    </div>
  );
}

function WorkDraftActions({
  lang,
  draftable,
  drafting,
  draftText,
  showDone,
  onDraft,
  onMarkDone,
}: {
  lang: OutputLang;
  draftable: boolean;
  drafting: boolean;
  draftText: string;
  showDone: boolean;
  onDraft?: () => void;
  onMarkDone?: () => void;
}) {
  const c = p(lang);
  return (
    <div className="space-y-3 pt-2">
      {draftable && onDraft ? (
        <Button type="button" size="sm" disabled={drafting} onClick={onDraft}>
          {drafting ? c.draftingWork : c.draftForTask}
        </Button>
      ) : null}
      {!draftable ? <p className="text-xs leading-relaxed text-muted">{c.cannotDraft}</p> : null}
      {draftText ? (
        <div className="space-y-2">
          <p className="text-xs text-accent">{c.draftSaved}</p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-elevated px-3 py-3 font-sans text-sm leading-relaxed">
            {draftText}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(draftText);
                toast.success(c.draftCopied);
              }}
            >
              {c.copyDraft}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                downloadWordFile(`${slugFilename("citebench-draft")}.doc`, textAsWordHtml("CiteBench draft", draftText))
              }
            >
              {c.wordBrief}
            </Button>
            {showDone && onMarkDone ? (
              <Button type="button" size="sm" variant="ghost" onClick={onMarkDone}>
                {c.markDone}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function EventBody({
  e,
  lang,
  onSave,
  onVerify,
}: {
  e: TimelineEvent;
  lang: OutputLang;
  onSave?: (patch: { happenedOn: string; title: string; detail: string }) => Promise<void>;
  onVerify?: () => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState({ happenedOn: e.happenedOn || "", title: e.title, detail: e.detail || "" });
  const [busy, setBusy] = useState(false);
  useEffect(
    () => setForm({ happenedOn: e.happenedOn || "", title: e.title, detail: e.detail || "" }),
    [e.id, e.happenedOn, e.title, e.detail],
  );
  const verificationLabel =
    e.verification === "lawyer_verified"
      ? c.verified
      : e.verification === "court_imported"
        ? c.courtImported
        : e.verification === "ai_inferred"
          ? c.aiSuggestion
          : c.unreviewed;
  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      <TrustChip origin={e.origin} lang={lang} />
      {e.verification ? <span className="text-[11px] uppercase tracking-wide text-muted">{verificationLabel}</span> : null}
    </div>
  );
  if (!onSave) {
    return (
      <div className="space-y-3 text-sm">
        <div className="text-xs tabular-nums text-accent">{e.happenedOn}</div>
        {chips}
        {e.detail ? <p className="leading-relaxed whitespace-pre-wrap">{e.detail}</p> : null}
      </div>
    );
  }
  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(ev) => {
        ev.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      {chips}
      <Field>
        <Label htmlFor="e-on">{c.date}</Label>
        <Input id="e-on" type="date" value={form.happenedOn} onChange={(ev) => setForm({ ...form, happenedOn: ev.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="e-title">{c.paperTitle}</Label>
        <Input id="e-title" value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} />
      </Field>
      <Textarea className="min-h-28" value={form.detail} onChange={(ev) => setForm({ ...form, detail: ev.target.value })} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.saveEntry}
        </Button>
        {onVerify && e.verification !== "lawyer_verified" ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void onVerify().finally(() => setBusy(false));
            }}
          >
            {c.markVerified}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function MatterFileBody({
  matter,
  lang,
  onSave,
}: {
  matter: Matter;
  lang: OutputLang;
  onSave: (patch: {
    title: string;
    clientName: string;
    courtName: string;
    caseNumber: string;
    cnr: string;
    caseType: string;
    jurisdiction: string;
    ourSide: string;
    partiesText: string;
    notes: string;
    status: "active" | "stayed" | "dormant" | "closed";
  }) => Promise<void>;
}) {
  const c = p(lang);
  const status = (["active", "stayed", "dormant", "closed"] as const).includes(matter.status as "active")
    ? (matter.status as "active" | "stayed" | "dormant" | "closed")
    : "active";
  const [form, setForm] = useState(() => matterFields(matter, status));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(matterFields(matter, status)), [matter.id, matter.title, matter.notes, matter.status, matter.updatedAt]);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      <Field>
        <Label htmlFor="m-title">{c.saveMatter}</Label>
        <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </Field>
      <Field>
        <Label htmlFor="m-client">{c.client}</Label>
        <Input id="m-client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="m-court">{c.courtName}</Label>
        <Input id="m-court" value={form.courtName} onChange={(e) => setForm({ ...form, courtName: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="m-case">{c.caseNo}</Label>
          <Input id="m-case" value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-cnr">{c.cnr}</Label>
          <Input id="m-cnr" value={form.cnr} onChange={(e) => setForm({ ...form, cnr: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="m-type">{c.caseType}</Label>
          <Input id="m-type" value={form.caseType} onChange={(e) => setForm({ ...form, caseType: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-jur">{c.jurisdiction}</Label>
          <Input id="m-jur" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="m-side">{c.ourSide}</Label>
        <Select id="m-side" value={form.ourSide} onChange={(e) => setForm({ ...form, ourSide: e.target.value })}>
          {OUR_SIDES.map((side) => (
            <option key={side} value={side}>
              {side}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor="m-status">{c.statusActive}</Label>
        <Select id="m-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
          <option value="active">{c.statusActive}</option>
          <option value="stayed">{c.statusStayed}</option>
          <option value="dormant">{c.statusDormant}</option>
          <option value="closed">{c.statusClosed}</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor="m-parties">{c.parties}</Label>
        <Textarea id="m-parties" className="min-h-24" value={form.partiesText} onChange={(e) => setForm({ ...form, partiesText: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="m-notes">{c.notes}</Label>
        <Textarea id="m-notes" className="min-h-32" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? c.savingEntry : c.saveEntry}
      </Button>
    </form>
  );
}

function matterFields(matter: Matter, status: "active" | "stayed" | "dormant" | "closed") {
  return {
    title: matter.title,
    clientName: matter.clientName || "",
    courtName: matter.courtName || "",
    caseNumber: matter.caseNumber || "",
    cnr: matter.cnr || "",
    caseType: matter.caseType || "",
    jurisdiction: matter.jurisdiction || "",
    ourSide: matter.ourSide || "petitioner",
    partiesText: formatParties(matter.parties),
    notes: matter.notes || "",
    status,
  };
}

export function MemoFileBody({
  title,
  createdAt,
  facts,
  issues,
  lang,
  onOpenFull,
}: {
  title: string;
  createdAt: string;
  facts: string;
  issues: string[];
  lang: OutputLang;
  onOpenFull?: () => void;
}) {
  const c = p(lang);
  return (
    <div className="space-y-4 text-sm">
      <div className="text-xs tabular-nums text-muted">{createdAt.slice(0, 10)}</div>
      {facts ? <p className="leading-relaxed">{facts}</p> : <p className="text-muted">{title}</p>}
      {issues.length ? (
        <ol className="list-decimal space-y-1 pl-4">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ol>
      ) : null}
      {onOpenFull ? (
        <Button type="button" size="sm" onClick={onOpenFull}>
          {c.openMemo}
        </Button>
      ) : null}
    </div>
  );
}

export function StatuteFileBody({ s }: { s: StatuteRef }) {
  return (
    <div className="space-y-3 text-sm">
      {s.sections ? <div className="text-xs uppercase tracking-wide text-muted">{s.sections}</div> : null}
      {s.why ? <p className="leading-relaxed">{s.why}</p> : null}
      {s.url ? (
        <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          {s.url}
        </a>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 leading-relaxed">{value}</dd>
    </div>
  );
}
