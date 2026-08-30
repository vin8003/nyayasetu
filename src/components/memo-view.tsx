import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Copy, Printer, Bookmark, FileDown, Scale, MessageSquare, ScrollText } from "lucide-react";
import { toast } from "sonner";
import type { Binding, LegalMemo, LetterKind, OutputLang, Strength } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { formatMemoBrief, formatMemoBriefHtml } from "@/lib/research/brief";
import { httpHref } from "@/lib/research/verify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TABS = ["brief", "issues", "cases", "law", "args", "sources"] as const;
type Tab = (typeof TABS)[number];

function bindingTone(b: Binding): "ok" | "accent" | "warn" {
  if (b === "binding") return "ok";
  if (b === "distinguishable") return "warn";
  return "accent";
}

function strengthTone(s: Strength): "ok" | "accent" | "warn" {
  if (s === "strong") return "ok";
  if (s === "contested") return "warn";
  return "accent";
}

function normalizeMemo(text: string): string {
  return text
    .replace(/\*\*([^*]{2,48}):\*\*/g, "\n\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function MemoBody({ text }: { text: string }) {
  const blocks = useMemo(() => normalizeMemo(text).split(/\n{2,}/).filter(Boolean), [text]);
  return (
    <div className="space-y-4 font-display text-[17px] leading-[1.65] text-paper-ink">
      {blocks.map((block, i) => {
        const heading = /^(issues?|law|precedents?|analysis|conclusion|submissions?|facts|strategy|प्र|मुद्दे|कानून|नज़ीर|निष्कर्ष|दलील|तथ्य)/i.test(
          block.trim(),
        ) && block.length < 80;
        if (heading) {
          return (
            <h3 key={i} className="pt-2 font-display text-lg font-medium tracking-tight text-paper-ink">
              {block}
            </h3>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function ExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const safe = httpHref(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a href={safe} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}

export function MemoView({
  lang,
  memo,
  saved = false,
  onBack,
  onSave,
  onDraft,
}: {
  lang: OutputLang;
  memo: LegalMemo;
  saved?: boolean;
  onBack: () => void;
  onSave: () => void;
  onDraft: (kind: LetterKind) => void;
}) {
  const c = t(lang);
  const [tab, setTab] = useState<Tab>("brief");

  const tabLabel: Record<Tab, string> = {
    brief: c.tabBrief,
    issues: c.tabIssues,
    cases: c.tabCases,
    law: c.tabLaw,
    args: c.tabArgs,
    sources: c.tabSources,
  };

  async function copyMemo() {
    await navigator.clipboard.writeText(formatMemoBrief(memo, lang));
    toast.success(c.copied);
  }

  function downloadWord() {
    const html = formatMemoBriefHtml(memo, lang);
    const blob = new Blob([html], { type: "application/msword" });
    const href = URL.createObjectURL(blob);
    const slug = (memo.title || "citebench-memo")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slug || "citebench-memo"}.doc`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {c.back}
          </button>
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">{memo.title}</h1>
          {memo.causeTitle ? <p className="mt-1 text-sm text-muted">{memo.causeTitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onDraft("notice")}>
            <Scale className="size-3.5" />
            {c.draftNotice}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDraft("reply")}>
            <MessageSquare className="size-3.5" />
            {c.draftReply}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDraft("petition")}>
            <ScrollText className="size-3.5" />
            {c.draftPetition}
          </Button>
          <Button variant="outline" size="sm" onClick={copyMemo}>
            <Copy className="size-3.5" />
            {c.copyMemo}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            {c.print}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadWord}>
            <FileDown className="size-3.5" />
            {c.wordBrief}
          </Button>
          <Button variant="paper" size="sm" onClick={onSave} disabled={saved}>
            <Bookmark className="size-3.5" />
            {saved ? c.saved : c.save}
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        className="no-print -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "h-10 shrink-0 rounded-md px-3 text-sm font-medium transition-[background-color,color] duration-150",
              tab === id ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {tabLabel[id]}
          </button>
        ))}
      </div>

      {tab === "brief" ? (
        <article className="no-print print-paper rounded-xl bg-paper px-5 py-8 text-paper-ink shadow-[var(--shadow-paper)] sm:px-10 sm:py-12">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-paper-muted">
            CiteBench · research memorandum
          </p>
          <MemoBody text={memo.fullMemo} />
          {memo.unverified.length > 0 ? (
            <div className="mt-8 rounded-md bg-paper-ink/5 px-4 py-3 text-sm text-paper-muted">
              <p className="font-medium text-paper-ink">{c.unverified}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {memo.unverified.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}

      {tab === "issues" ? (
        <div className="no-print stagger-in space-y-3">
          <h2 className="font-display text-xl">{c.issues}</h2>
          {memo.issues.map((issue, i) => (
            <section key={i} className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <p className="font-mono text-xs text-accent">Q.{i + 1}</p>
              <h3 className="mt-1 font-display text-lg">{issue.issue}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{issue.framing}</p>
            </section>
          ))}
          <h2 className="pt-4 font-display text-xl">{c.points}</h2>
          {memo.pointsForCourt.map((p, i) => (
            <section key={i} className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{p.point}</h3>
                <Badge tone={strengthTone(p.strength)}>{c[p.strength]}</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.likelyOutcome}</p>
            </section>
          ))}
        </div>
      ) : null}

      {tab === "cases" ? (
        <div className="no-print stagger-in space-y-3">
          <h2 className="font-display text-xl">{c.precedents}</h2>
          {memo.precedents.length === 0 ? (
            <p className="text-sm text-muted">{c.unverified}</p>
          ) : (
            memo.precedents.map((p, i) => (
              <article key={i} className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg">{p.title}</h3>
                  <Badge tone={bindingTone(p.binding)}>{c[p.binding]}</Badge>
                  {!p.verified ? <Badge tone="warn">{c.unverified.split("—")[0]}</Badge> : null}
                </div>
                <p className="mt-1 font-mono text-xs text-muted">
                  {p.citation}
                  {p.year ? ` · ${p.year}` : ""}
                  {p.court ? ` · ${p.court}` : ""}
                </p>
                <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-subtle">Ratio</dt>
                    <dd className="mt-1 text-fg/90">{p.ratio}</dd>
                  </div>
                  {p.factsOverlap ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-subtle">Facts</dt>
                      <dd className="mt-1 text-muted">{p.factsOverlap}</dd>
                    </div>
                  ) : null}
                  {p.howToUse ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-subtle">Use</dt>
                      <dd className="mt-1 text-muted">{p.howToUse}</dd>
                    </div>
                  ) : null}
                </dl>
                {p.url ? (
                  <ExternalLink href={p.url} className="mt-4 inline-block text-sm text-accent hover:text-fg">
                    {p.url.replace(/^https?:\/\//, "")}
                  </ExternalLink>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "law" ? (
        <div className="no-print stagger-in grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 font-display text-xl">{c.statutes}</h2>
            <div className="space-y-3">
              {memo.statutes.map((s, i) => (
                <article key={i} className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                  <h3 className="font-medium">{s.name}</h3>
                  <p className="mt-1 font-mono text-xs text-accent">{s.sections}</p>
                  <p className="mt-2 text-sm text-muted">{s.why}</p>
                  {s.url ? (
                    <ExternalLink href={s.url} className="mt-2 inline-block text-xs text-accent">
                      {s.url.replace(/^https?:\/\//, "")}
                    </ExternalLink>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-display text-xl">{c.doctrines}</h2>
            <div className="space-y-3">
              {memo.doctrines.map((d, i) => (
                <article key={i} className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                  <h3 className="font-display text-lg italic">{d.name}</h3>
                  <p className="mt-2 text-sm text-muted">{d.explanation}</p>
                  {d.leadingCase ? (
                    <p className="mt-2 font-mono text-xs text-subtle">{d.leadingCase}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "args" ? (
        <div className="no-print stagger-in grid gap-6 lg:grid-cols-3">
          <ArgCol title={c.forSide} items={memo.argumentsFor} />
          <ArgCol title={c.against} items={memo.argumentsAgainst} />
          <ArgCol title={c.counters} items={memo.counters} />
          <section className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)] lg:col-span-2">
            <h2 className="font-display text-lg">{c.strategy}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{memo.strategy}</p>
          </section>
          <section className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
            <h2 className="font-display text-lg">{c.risks}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted">
              {memo.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "sources" ? (
        <div className="no-print stagger-in space-y-6">
          <section>
            <h2 className="mb-3 font-display text-xl">{c.tabSources}</h2>
            <ul className="space-y-2">
              {memo.sources.map((s, i) => (
                <li key={i} className="rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                  <ExternalLink href={s.url} className="text-sm text-accent hover:text-fg">
                    {s.title || s.url}
                  </ExternalLink>
                  <p className="mt-0.5 text-xs text-muted">
                    {s.publisher}
                    {s.url ? ` · ${s.url.replace(/^https?:\/\//, "")}` : ""}
                  </p>
                </li>
              ))}
              {memo.citationUrls
                .filter((u) => !memo.sources.some((s) => s.url === u))
                .map((u) => (
                  <li key={u} className="rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
                    <ExternalLink href={u} className="text-sm text-accent hover:text-fg">
                      {u.replace(/^https?:\/\//, "")}
                    </ExternalLink>
                  </li>
                ))}
            </ul>
          </section>
          {memo.searchedQueries.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted">{c.searched}</h2>
              <ul className="flex flex-wrap gap-2">
                {memo.searchedQueries.map((q) => (
                  <li key={q}>
                    <Badge>{q}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <article className="print-only print-paper rounded-xl bg-paper px-5 py-8 text-paper-ink">
        <pre className="whitespace-pre-wrap font-display text-[17px] leading-[1.65]">{formatMemoBrief(memo, lang)}</pre>
      </article>

      <p className="no-print text-xs leading-relaxed text-subtle">{c.disclaimer}</p>
    </div>
  );
}

function ArgCol({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
      <h2 className="font-display text-lg">{title}</h2>
      <ol className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span className="font-mono text-xs text-accent">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
