import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Copy, FileDown, Gavel } from "lucide-react";
import { toast } from "sonner";
import { TrustChip } from "@/components/trust-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { formatDay } from "@/lib/dates";
import { p, sideLabel } from "@/lib/practice/copy";
import { formatParties } from "@/lib/practice/ids";
import { classifyTaskDraft } from "@/lib/practice/task-draft-class";
import { OUR_SIDES } from "@/lib/practice/types";
import { downloadWordFile, slugFilename, textAsWordHtml } from "@/lib/research/word-file";
import type { OutputLang, StatuteRef } from "@/lib/research/types";
import { httpHref } from "@/lib/research/verify";
import type { Deadline, Hearing, Matter, MatterDocument, MatterOrder, Task, TimelineEvent } from "@/lib/practice/types";

/** The record overlay: a slide-over on desktop, a bottom sheet on a phone. */
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
  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={title}
      kicker={kicker}
      closeLabel={c.close}
      footer={
        linkedLabel && onOpenLinked ? (
          <Button variant="outline" className="w-full sm:w-auto" onClick={onOpenLinked}>
            {c.openLinked}: {linkedLabel}
          </Button>
        ) : null
      }
    >
      {children}
    </SlideOver>
  );
}

function CopyAndWord({ lang, title, text }: { lang: OutputLang; title: string; text: string }) {
  const c = p(lang);
  if (!text.trim()) return null;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          toast.success(c.draftCopied);
        }}
      >
        <Copy className="size-3.5" aria-hidden />
        {c.copyDoc}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadWordFile(`${slugFilename(title, "citebench-paper")}.doc`, textAsWordHtml(title, text))}
      >
        <FileDown className="size-3.5" aria-hidden />
        {c.wordBrief}
      </Button>
    </>
  );
}

type ListingPatch = { listedOn: string; listedAt: string; purpose: string; courtRoom: string; bench: string; outcome: string; notes: string; nextDate: string };
type OutcomePatch = { outcome: string; courtSaid: string; nextDate: string };

/**
 * A listing. Once its date has come, the first thing asked is what happened;
 * recording a next date there also lists that date in the diary.
 */
export function HearingBody({
  h,
  lang,
  today,
  onSaveListing,
  onRecord,
}: {
  h: Hearing;
  lang: OutputLang;
  today: string;
  onSaveListing: (patch: ListingPatch) => Promise<void>;
  onRecord: (patch: OutcomePatch) => Promise<void>;
}) {
  const c = p(lang);
  const [listing, setListing] = useState(() => listingFields(h));
  const [outcome, setOutcome] = useState<OutcomePatch>({ outcome: h.outcome || "", courtSaid: h.notes || "", nextDate: h.nextDate || "" });
  const [busy, setBusy] = useState<"" | "listing" | "outcome">("");
  const due = h.listedOn <= today;

  useEffect(() => {
    setListing(listingFields(h));
    setOutcome({ outcome: h.outcome || "", courtSaid: h.notes || "", nextDate: h.nextDate || "" });
  }, [h.id, h.listedOn, h.listedAt, h.purpose, h.courtRoom, h.bench, h.outcome, h.notes, h.nextDate]);

  const outcomeForm = (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy("outcome");
        void onRecord(outcome).finally(() => setBusy(""));
      }}
    >
      <h3 className="section-title">{c.recordHearing}</h3>
      <Field>
        <Label htmlFor="h-out">{c.outcome}</Label>
        <Textarea id="h-out" className="min-h-20" value={outcome.outcome} onChange={(e) => setOutcome({ ...outcome, outcome: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-said">{c.whatCourtSaid}</Label>
        <Textarea id="h-said" className="min-h-24" value={outcome.courtSaid} onChange={(e) => setOutcome({ ...outcome, courtSaid: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="h-next">{c.nextDate}</Label>
        <Input id="h-next" type="date" value={outcome.nextDate} onChange={(e) => setOutcome({ ...outcome, nextDate: e.target.value })} />
        <Hint>{lang === "hi" ? "अगली तारीख डायरी में जुड़ जाएगी।" : "The next date is added to the diary."}</Hint>
      </Field>
      <div>
        <Button type="submit" disabled={busy !== ""}>
          {busy === "outcome" ? c.savingEntry : c.recordHearing}
        </Button>
      </div>
    </form>
  );

  const listingForm = (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy("listing");
        void onSaveListing({ ...listing, outcome: outcome.outcome, notes: outcome.courtSaid, nextDate: outcome.nextDate }).finally(() => setBusy(""));
      }}
    >
      <h3 className="section-title">{lang === "hi" ? "पेशी का विवरण" : "Listing"}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="h-date">{c.date}</Label>
          <Input id="h-date" type="date" value={listing.listedOn} onChange={(e) => setListing({ ...listing, listedOn: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="h-time">{c.listedAt}</Label>
          <Input id="h-time" value={listing.listedAt} placeholder="10:30" onChange={(e) => setListing({ ...listing, listedAt: e.target.value })} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="h-purpose">{c.purpose}</Label>
        <Input id="h-purpose" value={listing.purpose} onChange={(e) => setListing({ ...listing, purpose: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor="h-room">{c.courtroom}</Label>
          <Input id="h-room" value={listing.courtRoom} onChange={(e) => setListing({ ...listing, courtRoom: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="h-bench">{lang === "hi" ? "बेंच" : "Bench"}</Label>
          <Input id="h-bench" value={listing.bench} onChange={(e) => setListing({ ...listing, bench: e.target.value })} />
        </Field>
      </div>
      <div>
        <Button type="submit" variant="outline" disabled={busy !== ""}>
          {busy === "listing" ? c.savingEntry : c.saveEntry}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      {h.outcome || h.notes ? (
        <dl className="guide rounded-lg bg-elevated px-4 py-3">
          {h.outcome ? (
            <>
              <dt>{c.outcome}</dt>
              <dd>{h.outcome}</dd>
            </>
          ) : null}
          {h.notes ? (
            <>
              <dt>{c.whatCourtSaid}</dt>
              <dd className="whitespace-pre-wrap">{h.notes}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {due ? outcomeForm : null}
      {due ? <hr className="hairline" /> : null}
      {listingForm}
      {!due ? (
        <>
          <hr className="hairline" />
          {outcomeForm}
        </>
      ) : null}
    </div>
  );
}

function listingFields(h: Hearing) {
  return {
    listedOn: h.listedOn || "",
    listedAt: h.listedAt || "",
    purpose: h.purpose || "",
    courtRoom: h.courtRoom || "",
    bench: h.bench || "",
  };
}

const KIND_KEYS = ["pleading", "order", "notice", "evidence", "other"] as const;

export function kindLabel(lang: OutputLang, kind: string) {
  const c = p(lang);
  if (kind === "order") return c.kindOrder;
  if (kind === "pleading") return c.kindPleading;
  if (kind === "evidence") return c.kindEvidence;
  if (kind === "notice") return c.kindNotice;
  return c.kindOther;
}

export function sourceBadge(lang: OutputLang, sourceKind: string) {
  const c = p(lang);
  if (sourceKind === "ai_draft") return <Badge tone="warn">{c.aiDraftLabel}</Badge>;
  if (sourceKind === "eci_partner" || sourceKind === "indiankanoon") return <Badge tone="accent">{c.fromCourt}</Badge>;
  return null;
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
  onSave: (patch: { title: string; body: string; kind: string }) => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState({ title: d.title, body: d.text || "", kind: d.kind || "other" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ title: d.title, body: d.text || "", kind: d.kind || "other" }), [d.id, d.title, d.text, d.kind]);
  const source = httpHref(d.sourceUrl ?? "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {sourceBadge(lang, d.sourceKind)}
        {d.createdAt ? <span className="text-xs text-muted">{formatDay(d.createdAt, lang)}</span> : null}
        {source ? (
          <a href={source} target="_blank" rel="noopener noreferrer" className="link-accent truncate text-xs">
            {source.replace(/^https?:\/\//, "").slice(0, 60)}
          </a>
        ) : null}
      </div>
      {d.sourceKind === "ai_draft" ? (
        <p className="callout is-warn text-[0.8125rem]">{lang === "hi" ? "यह CiteBench का ड्राफ्ट है। फाइल करने से पहले हर तथ्य और साइटेशन जाँचें।" : "This is a CiteBench draft. Check every fact and citation before you file it."}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field>
          <Label htmlFor="d-title">{c.paperTitle}</Label>
          <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="d-kind">{c.paperKind}</Label>
          <Select id="d-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KIND_KEYS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(lang, k)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field>
        <Label htmlFor="d-body">{c.paperBody}</Label>
        <Textarea id="d-body" className="min-h-72 font-serif text-[0.9375rem] leading-relaxed" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.saveEntry}
        </Button>
        <CopyAndWord lang={lang} title={form.title} text={form.body} />
        {onReadOrder && form.body.trim().length >= 40 ? (
          <Button variant="outline" size="sm" onClick={onReadOrder}>
            <Gavel className="size-3.5" aria-hidden />
            {c.readAsOrder}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function OrderBody({
  o,
  lang,
  onSave,
  onReview,
}: {
  o: MatterOrder;
  lang: OutputLang;
  onSave: (patch: { orderDate: string; body: string }) => Promise<void>;
  onReview?: () => void;
}) {
  const c = p(lang);
  const [form, setForm] = useState({ orderDate: o.orderDate || "", body: o.body || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ orderDate: o.orderDate || "", body: o.body || "" }), [o.id, o.orderDate, o.body]);
  return (
    <div className="flex flex-col gap-5">
      {!o.confirmed ? (
        <div className="callout is-warn">
          <span className="flex flex-1 flex-wrap items-center justify-between gap-2">
            <span>{c.ordersPendingOne}</span>
            {onReview ? (
              <Button size="sm" onClick={onReview}>
                {c.reviewInInbox}
              </Button>
            ) : null}
          </span>
        </div>
      ) : null}
      {o.directions?.length ? (
        <section>
          <h3 className="section-title mb-2">{c.extractedDirections}</h3>
          <ul className="list">
            {o.directions.map((d, i) => (
              <li key={i} className="px-4 py-3 text-sm">
                <div className="leading-relaxed">{d.text}</div>
                <div className="list-meta mt-1">
                  {d.party ? <span>{d.party}</span> : null}
                  {d.deadline ? <span className="tabular-nums">{formatDay(d.deadline, lang)}</span> : null}
                </div>
                {d.quote ? <p className="mt-1.5 font-serif text-[0.8125rem] italic leading-relaxed text-muted">“{d.quote}”</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onSave(form).finally(() => setBusy(false));
        }}
      >
        <Field>
          <Label htmlFor="o-date">{c.orderDate}</Label>
          <Input id="o-date" type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} className="sm:max-w-48" />
        </Field>
        <Field>
          <Label htmlFor="o-body">{c.pasteOrder}</Label>
          <Textarea id="o-body" className="min-h-64 font-serif text-[0.9375rem] leading-relaxed" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
          <CopyAndWord lang={lang} title={`${c.orders} ${o.orderDate ?? ""}`.trim()} text={form.body} />
        </div>
      </form>
    </div>
  );
}

function WorkBody({
  item,
  kind,
  lang,
  drafting,
  draftText,
  onDraft,
  onMarkDone,
  onSave,
}: {
  item: Task | Deadline;
  kind: "task" | "deadline";
  lang: OutputLang;
  drafting: boolean;
  draftText: string;
  onDraft?: () => void;
  onMarkDone?: () => void;
  onSave: (patch: { title: string; dueOn: string }) => Promise<void>;
}) {
  const c = p(lang);
  const classified = classifyTaskDraft(item.title, item.sourceQuote);
  const [form, setForm] = useState({ title: item.title, dueOn: item.dueOn || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ title: item.title, dueOn: item.dueOn || "" }), [item.id, item.title, item.dueOn]);
  const open = item.status === "open";
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <TrustChip origin={item.origin} lang={lang} />
        {!open ? <Badge>{c.markDone}</Badge> : null}
      </div>
      {item.sourceQuote ? (
        <blockquote className="border-l border-hairline pl-3 font-serif text-[0.9375rem] italic leading-relaxed text-muted">
          “{item.sourceQuote}”
        </blockquote>
      ) : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void onSave(form).finally(() => setBusy(false));
        }}
      >
        <Field>
          <Label htmlFor="w-title">{kind === "task" ? c.taskTitle : c.deadline}</Label>
          <Input id="w-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="w-due">{c.due}</Label>
          <Input id="w-due" type="date" value={form.dueOn} onChange={(e) => setForm({ ...form, dueOn: e.target.value })} className="sm:max-w-48" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="outline" disabled={busy}>
            {busy ? c.savingEntry : c.saveEntry}
          </Button>
          {open && onMarkDone ? (
            <Button variant="ghost" onClick={onMarkDone}>
              {c.markDone}
            </Button>
          ) : null}
        </div>
      </form>

      <section className="border-t border-border pt-5">
        {classified.draftable && onDraft ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">
              {lang === "hi"
                ? "CiteBench फ़ाइल के तथ्यों से इसका ड्राफ्ट बना सकता है। ड्राफ्ट कागज़ात में सेव होगा।"
                : "CiteBench can draft this from the facts on the file. The draft is saved to the papers."}
            </p>
            <div>
              <Button disabled={drafting} onClick={onDraft}>
                {drafting ? c.draftingWork : c.draftForTask}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">{c.cannotDraft}</p>
        )}
        {draftText ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs font-medium text-accent">{c.draftSaved}</p>
            <div className="paper max-h-96 overflow-auto px-4 py-3">
              <p className="prose-plain doc !text-[0.9375rem]">{draftText}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyAndWord lang={lang} title={item.title} text={draftText} />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function TaskBody(props: Omit<Parameters<typeof WorkBody>[0], "item" | "kind"> & { t: Task }) {
  const { t, ...rest } = props;
  return <WorkBody item={t} kind="task" {...rest} />;
}

export function DeadlineBody(props: Omit<Parameters<typeof WorkBody>[0], "item" | "kind"> & { d: Deadline }) {
  const { d, ...rest } = props;
  return <WorkBody item={d} kind="deadline" {...rest} />;
}

export function EventBody({
  e,
  lang,
  onSave,
  onVerify,
}: {
  e: TimelineEvent;
  lang: OutputLang;
  onSave: (patch: { happenedOn: string; title: string; detail: string }) => Promise<void>;
  onVerify?: () => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState({ happenedOn: e.happenedOn || "", title: e.title, detail: e.detail || "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ happenedOn: e.happenedOn || "", title: e.title, detail: e.detail || "" }), [e.id, e.happenedOn, e.title, e.detail]);
  const verificationLabel =
    e.verification === "lawyer_verified"
      ? c.verified
      : e.verification === "court_imported"
        ? c.courtImported
        : e.verification === "ai_inferred"
          ? c.aiSuggestion
          : c.unreviewed;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <TrustChip origin={e.origin} lang={lang} />
        {e.verification ? <Badge tone={e.verification === "lawyer_verified" ? "ok" : "muted"}>{verificationLabel}</Badge> : null}
      </div>
      <Field>
        <Label htmlFor="e-on">{c.date}</Label>
        <Input id="e-on" type="date" value={form.happenedOn} onChange={(ev) => setForm({ ...form, happenedOn: ev.target.value })} className="sm:max-w-48" />
      </Field>
      <Field>
        <Label htmlFor="e-title">{c.paperTitle}</Label>
        <Input id="e-title" value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="e-detail">{c.notes}</Label>
        <Textarea id="e-detail" className="min-h-28" value={form.detail} onChange={(ev) => setForm({ ...form, detail: ev.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.saveEntry}
        </Button>
        {onVerify && e.verification !== "lawyer_verified" ? (
          <Button
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

type MatterStatus = "active" | "stayed" | "dormant" | "closed";

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
    status: MatterStatus;
  }) => Promise<void>;
}) {
  const c = p(lang);
  const [form, setForm] = useState(() => matterFields(matter));
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(matterFields(matter)), [matter.id, matter.updatedAt]);
  return (
    <form
      id="matter-file-form"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        void onSave(form).finally(() => setBusy(false));
      }}
    >
      <Field>
        <Label htmlFor="m-title">{c.matterTitle}</Label>
        <Input id="m-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="m-court">{c.courtName}</Label>
          <Input id="m-court" value={form.courtName} onChange={(e) => setForm({ ...form, courtName: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-case">{c.caseNo}</Label>
          <Input id="m-case" value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-cnr">{c.cnr}</Label>
          <Input id="m-cnr" className="mono uppercase" spellCheck={false} value={form.cnr} onChange={(e) => setForm({ ...form, cnr: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-client">{c.client}</Label>
          <Input id="m-client" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
        </Field>
        <Field>
          <Label htmlFor="m-side">{c.ourSide}</Label>
          <Select id="m-side" value={form.ourSide} onChange={(e) => setForm({ ...form, ourSide: e.target.value })}>
            {OUR_SIDES.map((side) => (
              <option key={side} value={side}>
                {sideLabel(lang, side)}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="m-status">{c.status}</Label>
          <Select id="m-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MatterStatus })}>
            <option value="active">{c.statusActive}</option>
            <option value="stayed">{c.statusStayed}</option>
            <option value="dormant">{c.statusDormant}</option>
            <option value="closed">{c.statusClosed}</option>
          </Select>
        </Field>
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
        <Label htmlFor="m-parties">{c.parties}</Label>
        <Textarea id="m-parties" className="min-h-24" value={form.partiesText} placeholder={c.partiesPlaceholder} onChange={(e) => setForm({ ...form, partiesText: e.target.value })} />
        <Hint>{c.partiesHint}</Hint>
      </Field>
      <Field>
        <Label htmlFor="m-notes">{c.notes}</Label>
        <Textarea id="m-notes" className="min-h-40" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </Field>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? c.savingEntry : c.saveEntry}
        </Button>
      </div>
    </form>
  );
}

function matterFields(matter: Matter) {
  const status = (["active", "stayed", "dormant", "closed"] as const).includes(matter.status as MatterStatus)
    ? (matter.status as MatterStatus)
    : "active";
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
  createdAt,
  facts,
  issues,
  lang,
  onOpenFull,
}: {
  createdAt: string;
  facts: string;
  issues: string[];
  lang: OutputLang;
  onOpenFull: () => void;
}) {
  const c = p(lang);
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-xs text-muted">{formatDay(createdAt, lang)}</p>
      {facts ? <p className="leading-relaxed">{facts}</p> : null}
      {issues.length ? (
        <ol className="flex list-decimal flex-col gap-1.5 pl-4 font-serif text-[0.9375rem] leading-relaxed">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ol>
      ) : null}
      <div>
        <Button onClick={onOpenFull}>{c.openMemo}</Button>
      </div>
    </div>
  );
}

export function StatuteFileBody({ s }: { s: StatuteRef }) {
  const href = httpHref(s.url);
  return (
    <div className="flex flex-col gap-3 text-sm">
      {s.sections ? <p className="mono text-muted">{s.sections}</p> : null}
      {s.why ? <p className="leading-relaxed">{s.why}</p> : null}
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="link-accent break-all">
          {href.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
    </div>
  );
}
