import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarPlus, ChevronRight, FolderOpen, Gavel, Inbox as InboxIcon, Info, Paperclip, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { GuestPanel } from "@/components/guest-panel";
import { Segmented } from "@/components/segmented";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Field, Hint, Label, Select, Textarea } from "@/components/ui/field";
import { refreshCounts } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatDay, formatWeekday } from "@/lib/dates";
import { fill, p } from "@/lib/practice/copy";
import { extractOrder } from "@/lib/practice/extract-order";
import { readInboxDraft } from "@/lib/practice/inbox-draft";
import {
  addHearing,
  addTask,
  confirmOrder,
  discardOrder,
  listMatters,
  listUnconfirmedOrders,
  savePastedDocument,
  saveUnconfirmedOrder,
} from "@/lib/practice/store";
import type { Matter, MatterOrder, OrderExtract } from "@/lib/practice/types";
import { useChamberLang } from "@/lib/practice/use-lang";
import { stageDef } from "@/lib/practice/workflow";
import { extractUploads } from "@/lib/research/files";
import type { OutputLang } from "@/lib/research/types";
import { fileToBase64 } from "@/lib/read-file";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({
  validateSearch: (search: Record<string, unknown>): { matter?: string } => ({
    matter: typeof search.matter === "string" && search.matter.length > 0 ? search.matter : undefined,
  }),
  component: InboxPage,
});

type QueueRow = MatterOrder & { matterTitle?: string };
type Reverse = { from: string; to: string; fromLabel?: string; toLabel?: string; orderDate?: string; latestDate?: string };
type Review = { orderId: string; matterId: string; extract: OrderExtract; body: string; fromQueue: boolean };

function isUnauthorized(err: unknown) {
  return /unauthorized/i.test(String(err));
}

export function InboxPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const { matter: matterFromUrl } = Route.useSearch();
  const c = p(lang);
  const [matters, setMatters] = useState<Matter[] | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [mode, setMode] = useState<"cnr" | "paste">("cnr");
  const [matterId, setMatterId] = useState("");
  // A CNR opens a new file unless the lawyer picks one, so it never lands on the wrong case.
  const [cnrMatterId, setCnrMatterId] = useState(matterFromUrl ?? "");
  const [body, setBody] = useState("");
  const [fromFile, setFromFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [applyStage, setApplyStage] = useState(true);
  const [includeSuggestions, setIncludeSuggestions] = useState(true);
  const [reverse, setReverse] = useState<Reverse | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showText, setShowText] = useState(false);

  async function reloadQueue() {
    const rows = (await listUnconfirmedOrders()) as QueueRow[];
    setQueue(rows);
    refreshCounts();
    return rows;
  }

  useEffect(() => {
    if (!user) return;
    const draft = readInboxDraft();
    if (draft) {
      setMatterId(draft.matterId);
      setBody(draft.body);
      setMode("paste");
      setFromFile(true);
    } else if (matterFromUrl) {
      setMatterId(matterFromUrl);
      setCnrMatterId(matterFromUrl);
    }
    listMatters()
      .then((rows) => {
        const list = rows as Matter[];
        setMatters(list);
        setMatterId((current) => current || draft?.matterId || matterFromUrl || list[0]?.id || "");
        if (list.length === 0) setMode("cnr");
      })
      .catch((err) => {
        if (isUnauthorized(err)) navigate({ to: "/login" });
      });
    reloadQueue()
      .then((rows) => {
        // Arriving from a file with orders waiting: open the first one for that matter.
        if (!draft && matterFromUrl) {
          const first = rows.find((row) => row.matterId === matterFromUrl);
          if (first) openPending(first);
        }
      })
      .catch(() => undefined);
  }, [user?.id, matterFromUrl]);

  const matter = matters?.find((m) => m.id === (review?.matterId ?? matterId));

  async function onInboxFiles(list: FileList | null) {
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
      const text = String(extracted.combined || "").trim();
      if (text.length < 20) {
        toast.error(c.parseErr);
        return;
      }
      setBody(text);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  async function onAnalyse(e: FormEvent) {
    e.preventDefault();
    const target = matters?.find((m) => m.id === matterId);
    if (!target) {
      toast.error(c.noMatter);
      return;
    }
    if (body.trim().length < 20) {
      toast.error(c.parseErr);
      return;
    }
    setBusy(true);
    try {
      const result = await extractOrder({
        data: { matterTitle: target.title, proceeding: target.proceeding, stage: target.stage, orderText: body },
      });
      if (!result.ok) {
        if (result.error === "PAYWALL") {
          toast.error(c.paywall);
          navigate({ to: "/billing" });
          return;
        }
        toast.error(result.error === "PARSE" ? c.parseErr : c.failedAi);
        return;
      }
      const extract = result.extract as OrderExtract;
      const doc = await savePastedDocument({ data: { matterId: target.id, title: c.kindOrder, body, kind: "order" } });
      const saved = await saveUnconfirmedOrder({
        data: { matterId: target.id, body, directions: extract.directions, documentId: doc.id, orderDate: extract.orderDate || null },
      });
      if (doc.duplicate && saved.duplicate) toast.message(c.alreadyOnFile);
      setReview({ orderId: String(saved.id), matterId: target.id, extract, body, fromQueue: false });
      setReverse(null);
      setApplyStage(true);
      setIncludeSuggestions(true);
      setShowText(false);
      await reloadQueue();
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  function openPending(row: { id: string; matterId: string; body?: string; directions?: OrderExtract["directions"]; orderDate?: string | null }) {
    setReview({
      orderId: row.id,
      matterId: row.matterId,
      body: row.body || "",
      fromQueue: true,
      extract: {
        summary: "",
        nextHearing: null,
        directions: row.directions ?? [],
        suggestedTasks: [],
        stageHint: null,
        orderDate: row.orderDate ? String(row.orderDate).slice(0, 10) : null,
        caveats: [],
      },
    });
    setReverse(null);
    setShowText(true);
  }

  async function onConfirm(stageChoice?: "move" | "keep") {
    if (!review) return;
    setBusy(true);
    try {
      const { extract } = review;
      const result = (await confirmOrder({
        data: { orderId: review.orderId, applyStage: applyStage ? extract.stageHint : null, stageChoice },
      })) as { ok?: boolean; needsConfirm?: boolean; reverse?: Reverse; keptStage?: boolean } | undefined;
      if (result?.needsConfirm) {
        setReverse(result.reverse ?? null);
        return;
      }
      if (extract.nextHearing?.date) {
        await addHearing({ data: { matterId: review.matterId, listedOn: extract.nextHearing.date, purpose: extract.nextHearing.purpose } });
      }
      if (includeSuggestions) {
        for (const task of extract.suggestedTasks) {
          await addTask({ data: { matterId: review.matterId, title: task.title, origin: "ai_suggestion" } });
        }
      }
      toast.success(result?.keptStage ? c.reverseKeep : c.confirmed, {
        action: { label: c.openFile, onClick: () => navigate({ to: "/matters/$id", params: { id: review.matterId } }) },
      });
      const done = review.matterId;
      setReview(null);
      setReverse(null);
      setBody("");
      setFromFile(false);
      const rows = await reloadQueue();
      const next = rows.find((row) => row.matterId === done) ?? rows[0];
      if (next) openPending(next);
    } catch (err) {
      if (isUnauthorized(err)) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  async function onDiscard() {
    if (!review) return;
    setBusy(true);
    try {
      await discardOrder({ data: review.orderId });
      toast.message(c.discarded);
      setReview(null);
      setReverse(null);
      await reloadQueue();
    } finally {
      setBusy(false);
      setConfirmDiscard(false);
    }
  }

  return (
    <AppShell lang={lang} onLang={onLang} active="inbox">
      {isPending ? <div className="skeleton h-40" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user ? (
        <>
          <header className="page-head">
            <div className="page-head-text">
              <h1 className="page-title">{c.inbox}</h1>
              <p className="page-lead">{c.inboxLead}</p>
            </div>
          </header>

          <div className="split">
            <div className="min-w-0">
              {review ? (
                <ReviewPanel
                  lang={lang}
                  review={review}
                  matterTitle={matter?.title ?? queue.find((q) => q.id === review.orderId)?.matterTitle ?? ""}
                  matterProceeding={matter?.proceeding ?? "civil"}
                  busy={busy}
                  applyStage={applyStage}
                  includeSuggestions={includeSuggestions}
                  reverse={reverse}
                  showText={showText}
                  onShowText={setShowText}
                  onApplyStage={setApplyStage}
                  onIncludeSuggestions={setIncludeSuggestions}
                  onConfirm={(choice) => void onConfirm(choice)}
                  onDiscard={() => setConfirmDiscard(true)}
                  onClose={() => {
                    setReview(null);
                    setReverse(null);
                  }}
                />
              ) : (
                <section className="card card-pad" aria-labelledby="add-order">
                  <h2 id="add-order" className="section-title">
                    {c.addOrder}
                  </h2>
                  <div className="mt-3 max-w-sm">
                    <Segmented
                      ariaLabel={c.addOrder}
                      value={mode}
                      onChange={setMode}
                      options={[
                        { value: "cnr", label: c.fromCnr },
                        { value: "paste", label: c.pasteOrUpload },
                      ]}
                    />
                  </div>

                  {mode === "cnr" ? (
                    <div className="mt-5 flex flex-col gap-4">
                      {matters && matters.length > 0 ? (
                        <Field className="max-w-md">
                          <Label htmlFor="cnr-matter">{c.orderFor}</Label>
                          <Select id="cnr-matter" value={cnrMatterId} onChange={(e) => setCnrMatterId(e.target.value)}>
                            <option value="">{c.newMatterFromCnr}</option>
                            {matters.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.title}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <EciCnrFetch
                        lang={lang}
                        matterId={cnrMatterId || undefined}
                        defaultCnr={matters?.find((m) => m.id === cnrMatterId)?.cnr || ""}
                        submitLabel={c.eciFetchAction}
                        onLanded={async (landed) => {
                          if (landed.matterId) {
                            setMatterId(landed.matterId);
                            setCnrMatterId(landed.matterId);
                          }
                          const rows = await reloadQueue();
                          const first = landed.pending?.[0];
                          if (first) {
                            openPending({ id: first.id, matterId: landed.matterId, body: first.body, directions: first.directions, orderDate: first.orderDate });
                          } else {
                            const row = rows.find((r) => r.matterId === landed.matterId);
                            if (row) openPending(row);
                          }
                          listMatters()
                            .then((list) => setMatters(list as Matter[]))
                            .catch(() => undefined);
                        }}
                      />
                    </div>
                  ) : matters && matters.length === 0 ? (
                    <p className="mt-5 text-sm text-muted">{c.noMattersInbox}</p>
                  ) : (
                    <form className="mt-5 flex flex-col gap-4" onSubmit={onAnalyse}>
                      {fromFile ? (
                        <p className="callout !py-2 text-[0.8125rem]">
                          <Info className="size-4 text-muted" aria-hidden />
                          {c.readingFromFile}
                        </p>
                      ) : null}
                      <Field className="max-w-md">
                        <Label htmlFor="order-matter">{c.orderFor}</Label>
                        <Select id="order-matter" value={matterId} onChange={(e) => setMatterId(e.target.value)}>
                          {(matters ?? []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.title}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field>
                        <Label htmlFor="order">{c.pasteOrder}</Label>
                        <Textarea
                          id="order"
                          className="min-h-56 font-serif text-[0.9375rem] leading-relaxed"
                          value={body}
                          placeholder={c.paperBodyPlaceholder}
                          onChange={(e) => setBody(e.target.value)}
                        />
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
                            void onInboxFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <Hint>{c.uploadHint}</Hint>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" size="lg" disabled={busy || body.trim().length < 20 || !matterId}>
                          <Gavel className="size-4" aria-hidden />
                          {busy ? c.analysing : c.analyseOrder}
                        </Button>
                        <p className="text-[0.8125rem] text-muted">{c.inboxHint}</p>
                      </div>
                    </form>
                  )}
                </section>
              )}
            </div>

            <aside className="split-aside min-w-0">
              <div className="section-head">
                <h2 className="section-title">
                  {c.waiting}
                  {queue.length ? <span className="count">{queue.length}</span> : null}
                </h2>
              </div>
              {queue.length === 0 ? (
                <div className="empty">
                  <span className="empty-icon" aria-hidden>
                    <InboxIcon className="size-[1.125rem]" />
                  </span>
                  <p className="empty-title">{c.waitingEmpty}</p>
                  <p className="empty-text">{c.waitingEmptyText}</p>
                </div>
              ) : (
                <ul className="list">
                  {queue.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={cn("list-row", review?.orderId === row.id && "is-on")}
                        aria-current={review?.orderId === row.id ? "true" : undefined}
                        onClick={() => openPending(row)}
                      >
                        <Gavel className="size-4 shrink-0 text-subtle" aria-hidden />
                        <span className="list-main">
                          <span className="list-title block truncate">{row.matterTitle || c.orders}</span>
                          <span className="list-meta">
                            {row.orderDate ? <span>{formatDay(String(row.orderDate), lang)}</span> : null}
                            <span>
                              {row.directions?.length ?? 0} {lang === "hi" ? "निर्देश" : row.directions?.length === 1 ? "direction" : "directions"}
                            </span>
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-subtle" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="fineprint mt-6">{c.trustNote}</p>
            </aside>
          </div>

          <ConfirmDialog
            open={confirmDiscard}
            onOpenChange={setConfirmDiscard}
            title={c.reject}
            text={c.discardConfirm}
            confirmLabel={c.reject}
            cancelLabel={c.cancel}
            danger
            busy={busy}
            onConfirm={() => void onDiscard()}
          />
        </>
      ) : null}
    </AppShell>
  );
}

function ReviewPanel({
  lang,
  review,
  matterTitle,
  matterProceeding,
  busy,
  applyStage,
  includeSuggestions,
  reverse,
  showText,
  onShowText,
  onApplyStage,
  onIncludeSuggestions,
  onConfirm,
  onDiscard,
  onClose,
}: {
  lang: OutputLang;
  review: Review;
  matterTitle: string;
  matterProceeding: string;
  busy: boolean;
  applyStage: boolean;
  includeSuggestions: boolean;
  reverse: Reverse | null;
  showText: boolean;
  onShowText: (next: boolean) => void;
  onApplyStage: (next: boolean) => void;
  onIncludeSuggestions: (next: boolean) => void;
  onConfirm: (choice?: "move" | "keep") => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  const c = p(lang);
  const { extract } = review;
  const stage = extract.stageHint ? stageDef(matterProceeding, extract.stageHint) : null;
  const stageLabel = stage ? (lang === "hi" ? stage.labelHi : stage.label) : extract.stageHint;
  return (
    <section className="card" aria-labelledby="review-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="review-title" className="text-base font-semibold">
            {c.reviewOrder}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            {matterTitle ? (
              <Link to="/matters/$id" params={{ id: review.matterId }} className="inline-flex items-center gap-1 font-medium text-fg hover:underline">
                <FolderOpen className="size-3.5 text-muted" aria-hidden />
                {matterTitle}
              </Link>
            ) : null}
            {extract.orderDate ? (
              <span>
                {c.orderDate}: {formatDay(extract.orderDate, lang)}
              </span>
            ) : null}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {c.close}
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
        {extract.summary ? (
          <section>
            <h3 className="label-sm">{c.extractSummary}</h3>
            <p className="mt-1 font-serif text-[1.0625rem] leading-relaxed">{extract.summary}</p>
          </section>
        ) : null}

        {extract.nextHearing?.date ? (
          <section className="callout">
            <CalendarPlus className="size-4 text-accent" aria-hidden />
            <span>
              <span className="font-medium">
                {c.nextHearing}: {formatWeekday(extract.nextHearing.date, lang)}
              </span>
              {extract.nextHearing.purpose ? <span className="text-muted"> · {extract.nextHearing.purpose}</span> : null}
              <span className="block text-[0.8125rem] text-muted">{lang === "hi" ? "पुष्टि पर डायरी में जुड़ेगी।" : "Added to the diary when you confirm."}</span>
            </span>
          </section>
        ) : null}

        <section>
          <h3 className="section-title mb-2">
            {c.extractedDirections}
            {extract.directions.length ? <span className="count">{extract.directions.length}</span> : null}
          </h3>
          {extract.directions.length === 0 ? (
            <p className="text-sm text-muted">{c.noDirections}</p>
          ) : (
            <ul className="list">
              {extract.directions.map((d, i) => (
                <li key={`${d.text}-${i}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed">{d.text}</p>
                    <TrustChip origin="court_direction" lang={lang} />
                  </div>
                  <p className="list-meta mt-1">
                    {d.party ? <span>{d.party}</span> : null}
                    {d.deadline ? <span className="tabular-nums">{`${c.due}: ${formatDay(d.deadline, lang)}`}</span> : null}
                  </p>
                  {d.quote ? <p className="mt-1.5 font-serif text-[0.875rem] italic leading-relaxed text-muted">“{d.quote}”</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {extract.suggestedTasks.length > 0 ? (
          <section>
            <h3 className="section-title mb-2">{c.suggestedTasks}</h3>
            <ul className="list">
              {extract.suggestedTasks.map((task, i) => (
                <li key={`${task.title}-${i}`} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[0.9375rem]">{task.title}</p>
                    <TrustChip origin="ai_suggestion" lang={lang} />
                  </div>
                  {task.reason ? <p className="mt-1 text-[0.8125rem] text-muted">{task.reason}</p> : null}
                </li>
              ))}
            </ul>
            <label className="check mt-2">
              <input type="checkbox" checked={includeSuggestions} onChange={(e) => onIncludeSuggestions(e.target.checked)} />
              {c.addSuggestedTasks}
            </label>
          </section>
        ) : null}

        {extract.stageHint ? (
          <label className="check">
            <input type="checkbox" checked={applyStage} onChange={(e) => onApplyStage(e.target.checked)} />
            {fill(c.moveStageTo, { stage: stageLabel ?? "" })}
          </label>
        ) : null}

        {extract.caveats.length > 0 ? (
          <div className="callout is-warn">
            <TriangleAlert className="size-4" aria-hidden />
            <span>
              <span className="font-medium">{c.caveats}: </span>
              {extract.caveats.join(" · ")}
            </span>
          </div>
        ) : null}

        {review.body ? (
          <section>
            <button type="button" className="link-quiet text-[0.8125rem]" aria-expanded={showText} onClick={() => onShowText(!showText)}>
              {showText ? (lang === "hi" ? "आदेश का पाठ छिपाएँ" : "Hide order text") : lang === "hi" ? "आदेश का पाठ देखें" : "Show order text"}
            </button>
            {showText ? (
              <div className="paper mt-2 max-h-80 overflow-auto px-4 py-3">
                <p className="prose-plain doc !text-[0.9375rem]">{review.body}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {reverse ? (
          <div className="callout is-warn flex-col !items-stretch" role="alert">
            <p className="font-medium">{c.reverseTitle}</p>
            <p className="text-muted">{c.reverseWarn}</p>
            <p className="tabular-nums">
              {`${reverse.fromLabel || reverse.from} → ${reverse.toLabel || reverse.to}`}
              {reverse.orderDate ? ` · ${formatDay(reverse.orderDate, lang)}` : ""}
              {reverse.latestDate ? ` · ${c.lastOrder} ${formatDay(reverse.latestDate, lang)}` : ""}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={() => onConfirm("keep")}>
                {c.reverseKeep}
              </Button>
              <Button disabled={busy} onClick={() => onConfirm("move")}>
                {c.reverseMove}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <Button onClick={() => onConfirm()} disabled={busy || Boolean(reverse)}>
          {busy ? c.savingEntry : c.confirm}
        </Button>
        <Button variant="ghost" onClick={onDiscard} disabled={busy}>
          {c.reject}
        </Button>
        <p className="min-w-0 flex-1 text-[0.8125rem] text-muted">{c.confirmHint}</p>
      </div>
    </section>
  );
}
