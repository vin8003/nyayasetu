import type { ReactNode } from "react";
import { useEffect } from "react";
import { TrustChip } from "@/components/trust-chip";
import { Button } from "@/components/ui/button";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";
import type {
  Deadline,
  Hearing,
  MatterDocument,
  MatterOrder,
  Task,
  TimelineEvent,
} from "@/lib/practice/types";

export const matterRowClass =
  "block w-full min-h-11 cursor-pointer rounded-lg bg-surface px-4 py-3 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.08)] transition-[box-shadow,background-color] duration-150 hover:bg-elevated hover:shadow-[0_0_0_1px_rgb(255_255_255/0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70";

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label={c.cancel}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex h-full w-full max-w-lg flex-col bg-bg shadow-[0_0_40px_rgb(0_0_0/0.45)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
          <div className="min-w-0">
            {kicker ? <div className="text-xs uppercase tracking-[0.18em] text-accent">{kicker}</div> : null}
            <h2 className="mt-1 font-display text-2xl leading-tight">{title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {c.cancel}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {linkedLabel && onOpenLinked ? (
          <div className="border-t border-border/80 px-5 py-3">
            <Button variant="outline" className="w-full" onClick={onOpenLinked}>
              {c.openLinked}: {linkedLabel}
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export function HearingBody({ h, lang }: { h: Hearing; lang: OutputLang }) {
  const c = p(lang);
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

export function DocumentBody({ d }: { d: MatterDocument }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">
        {d.kind} · {d.sourceKind}
      </div>
      <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg/90">{d.text}</pre>
    </div>
  );
}

export function OrderBody({ o, lang }: { o: MatterOrder; lang: OutputLang }) {
  const c = p(lang);
  return (
    <div className="space-y-4 text-sm">
      <div className="text-xs tabular-nums text-muted">
        {o.orderDate || "—"} {o.confirmed ? `· ${c.confirm}` : ""}
      </div>
      <pre className="whitespace-pre-wrap font-sans leading-relaxed text-fg/90">{o.body}</pre>
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

export function TaskBody({ t, lang }: { t: Task; lang: OutputLang }) {
  const c = p(lang);
  return (
    <div className="space-y-3 text-sm">
      <TrustChip origin={t.origin} lang={lang} />
      <Row label={c.due} value={t.dueOn ?? ""} />
      {t.sourceQuote ? <p className="leading-relaxed text-muted">{t.sourceQuote}</p> : null}
    </div>
  );
}

export function DeadlineBody({ d, lang }: { d: Deadline; lang: OutputLang }) {
  const c = p(lang);
  return (
    <div className="space-y-3 text-sm">
      <TrustChip origin={d.origin} lang={lang} />
      <Row label={c.due} value={d.dueOn} />
      {d.sourceQuote ? <p className="leading-relaxed text-muted">{d.sourceQuote}</p> : null}
    </div>
  );
}

export function EventBody({ e, lang }: { e: TimelineEvent; lang: OutputLang }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs tabular-nums text-accent">{e.happenedOn}</div>
      <TrustChip origin={e.origin} lang={lang} />
      {e.detail ? <p className="leading-relaxed">{e.detail}</p> : null}
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
