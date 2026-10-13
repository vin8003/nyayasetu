import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  FileDown,
  FileText,
  FolderOpen,
  MessageSquare,
  MoreHorizontal,
  Printer,
  Scale,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";
import type { Binding, LegalMemo, LetterKind, OutputLang, Strength } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { formatMemoBrief, formatMemoBriefHtml } from "@/lib/research/brief";
import { httpHref } from "@/lib/research/verify";
import type { NewMatterPrefill } from "@/lib/app-events";
import { AddToCase } from "@/components/add-to-case";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
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
    <div className="doc flex flex-col gap-4">
      {blocks.map((block, i) => {
        const heading =
          /^(issues?|law|precedents?|analysis|conclusion|submissions?|facts|strategy|प्र|मुद्दे|कानून|नज़ीर|निष्कर्ष|दलील|तथ्य)/i.test(block.trim()) &&
          block.length < 80;
        if (heading) {
          return (
            <h3 key={i} className="pt-2 text-lg">
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

function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const safe = httpHref(href);
  const wrap = cn("max-w-full [overflow-wrap:anywhere]", className);
  if (!safe) return <span className={wrap}>{children}</span>;
  return (
    <a href={safe} target="_blank" rel="noreferrer" className={wrap}>
      {children}
    </a>
  );
}

export function downloadMemoWord(memo: LegalMemo, lang: OutputLang) {
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

export function MemoView({
  lang,
  memo,
  memoId,
  saved = false,
  parentTitle,
  matter,
  prefill,
  onBack,
  onSave,
  onDraft,
  onContinue,
  onFiled,
}: {
  lang: OutputLang;
  memo: LegalMemo;
  memoId?: string | null;
  saved?: boolean;
  parentTitle?: string | null;
  matter?: { id: string; title: string } | null;
  prefill?: NewMatterPrefill;
  onBack: () => void;
  onSave: () => void;
  onDraft: (kind: LetterKind) => void;
  onContinue: () => void;
  onFiled?: (matterId: string) => void;
}) {
  const c = t(lang);
  const [tab, setTab] = useState<Tab>("brief");
  const verified = memo.precedents.filter((p) => p.verified).length;

  const tabLabel: Record<Tab, string> = {
    brief: c.tabBrief,
    issues: c.tabIssues,
    cases: c.tabCases,
    law: c.tabLaw,
    args: c.tabArgs,
    sources: c.tabSources,
  };
  const tabCount: Partial<Record<Tab, number>> = {
    issues: memo.issues.length,
    cases: memo.precedents.length,
    law: memo.statutes.length,
  };

  async function copyMemo() {
    await navigator.clipboard.writeText(formatMemoBrief(memo, lang));
    toast.success(c.copied);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="no-print">
        <button type="button" onClick={onBack} className="back-link">
          <ChevronLeft className="size-4" aria-hidden />
          {c.pageTitle}
        </button>
        <h1 className="page-title max-w-3xl">{memo.title}</h1>
        {memo.causeTitle ? <p className="mt-1 text-sm text-muted">{memo.causeTitle}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {matter ? (
            <Link
              to="/matters/$id"
              params={{ id: matter.id }}
              search={{ tab: "research" }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-fg hover:underline"
            >
              <FolderOpen className="size-4 text-muted" aria-hidden />
              {matter.title}
            </Link>
          ) : null}
          {parentTitle ? (
            <span className="text-sm text-muted">
              {c.followUpOf} · {parentTitle}
            </span>
          ) : null}
          <p className="stat-row">
            <span>
              <strong>{memo.issues.length}</strong> {c.statIssues}
            </span>
            <span>
              <strong>{memo.precedents.length}</strong> {c.statAuthorities}
            </span>
            <span>
              <strong className="!text-ok">{verified}</strong> {c.statVerified}
            </span>
            {memo.unverified.length > 0 ? (
              <span>
                <strong className="!text-warn">{memo.unverified.length}</strong> {c.statToCheck}
              </span>
            ) : null}
          </p>
        </div>

        <div className="toolbar mt-5">
          <Menu>
            <MenuTrigger asChild>
              <Button>
                <ScrollText className="size-4" aria-hidden />
                {c.draftMenu}
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Scale className="size-4" />} onSelect={() => onDraft("notice")}>
                {c.draftNotice}
              </MenuItem>
              <MenuItem icon={<MessageSquare className="size-4" />} onSelect={() => onDraft("reply")}>
                {c.draftReply}
              </MenuItem>
              <MenuItem icon={<ScrollText className="size-4" />} onSelect={() => onDraft("petition")}>
                {c.draftPetition}
              </MenuItem>
              <MenuItem icon={<FileText className="size-4" />} onSelect={() => onDraft("writtenStatement")}>
                {c.draftWrittenStatement}
              </MenuItem>
            </MenuContent>
          </Menu>
          <AddToCase
            lang={lang}
            matterId={matter?.id ?? null}
            onFiled={onFiled}
            source={{
              title: memo.title,
              body: formatMemoBrief(memo, lang),
              aiDraft: true,
              kind: "other",
              memoId: memoId ?? undefined,
              prefill: prefill ?? { title: memo.causeTitle || memo.title, notes: memo.factsSummary },
            }}
          />
          <Button variant="outline" size="sm" onClick={onContinue}>
            <MessageSquare className="size-4" aria-hidden />
            {c.askFollowUp}
          </Button>
          <span className="toolbar-sep hidden sm:block" aria-hidden />
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={c.moreMenu}>
                <MoreHorizontal className="size-4" aria-hidden />
                <span className="hidden sm:inline">{c.moreMenu}</span>
              </Button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem icon={<Copy className="size-4" />} onSelect={() => void copyMemo()}>
                {c.copyMemo}
              </MenuItem>
              <MenuItem icon={<FileDown className="size-4" />} onSelect={() => downloadMemoWord(memo, lang)}>
                {c.wordBrief}
              </MenuItem>
              <MenuItem icon={<Printer className="size-4" />} onSelect={() => window.print()}>
                {c.print}
              </MenuItem>
              {!saved ? (
                <>
                  <MenuSeparator />
                  <MenuItem icon={<Bookmark className="size-4" />} onSelect={onSave}>
                    {c.save}
                  </MenuItem>
                </>
              ) : null}
            </MenuContent>
          </Menu>
          {saved ? (
            <span className="inline-flex items-center gap-1 text-[0.8125rem] text-muted">
              <Check className="size-3.5 text-ok" aria-hidden />
              {c.savedMemo}
            </span>
          ) : null}
        </div>
      </header>

      <div role="tablist" className="tabs no-print">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="tab">
            {tabLabel[id]}
            {tabCount[id] ? <span className="count">{tabCount[id]}</span> : null}
          </button>
        ))}
      </div>

      {tab === "brief" ? (
        <article className="no-print print-paper paper doc-sheet">
          <p className="doc-head">
            CiteBench · {lang === "hi" ? "शोध मेमो" : "Research memorandum"}
          </p>
          <MemoBody text={memo.fullMemo} />
          {memo.unverified.length > 0 ? (
            <div className="mt-8 rounded-md border border-paper-line px-4 py-3 font-sans text-sm text-paper-muted">
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
        <div className="no-print flex max-w-3xl flex-col gap-6">
          <section>
            <h2 className="section-title mb-2.5">{c.issues}</h2>
            <ol className="list">
              {memo.issues.map((issue, i) => (
                <li key={i} className="flex gap-3 px-4 py-3.5">
                  <span className="pt-0.5 text-sm font-semibold tabular-nums text-muted">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="font-serif text-[1.0625rem] leading-snug">{issue.issue}</p>
                    {issue.framing ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{issue.framing}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {memo.pointsForCourt.length ? (
            <section>
              <h2 className="section-title mb-2.5">{c.points}</h2>
              <ul className="list">
                {memo.pointsForCourt.map((p, i) => (
                  <li key={i} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{p.point}</p>
                      <Badge tone={strengthTone(p.strength)}>{c[p.strength]}</Badge>
                    </div>
                    {p.likelyOutcome ? <p className="mt-1 text-sm leading-relaxed text-muted">{p.likelyOutcome}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "cases" ? (
        <div className="no-print flex max-w-3xl flex-col gap-3">
          {memo.precedents.length === 0 ? (
            <p className="text-sm text-muted">{c.unverified}</p>
          ) : (
            memo.precedents.map((p, i) => (
              <article key={i} className="card card-pad">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-lg font-semibold leading-snug">{p.title}</h3>
                  <Badge tone={bindingTone(p.binding)}>{c[p.binding]}</Badge>
                  {p.verified ? (
                    <Badge tone="ok">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                      {c.statVerified}
                    </Badge>
                  ) : (
                    <Badge tone="warn">{c.statToCheck}</Badge>
                  )}
                </div>
                <p className="mono mt-1 text-muted">
                  {[p.citation, p.year, p.court].filter(Boolean).join(" · ")}
                </p>
                <dl className="guide mt-4">
                  <dt>{lang === "hi" ? "रेशियो" : "Ratio"}</dt>
                  <dd>{p.ratio}</dd>
                  {p.factsOverlap ? (
                    <>
                      <dt>{lang === "hi" ? "तथ्यों से मेल" : "How the facts compare"}</dt>
                      <dd className="text-muted">{p.factsOverlap}</dd>
                    </>
                  ) : null}
                  {p.howToUse ? (
                    <>
                      <dt>{lang === "hi" ? "कैसे इस्तेमाल करें" : "How to use it"}</dt>
                      <dd className="text-muted">{p.howToUse}</dd>
                    </>
                  ) : null}
                </dl>
                {p.url ? (
                  <ExternalLink href={p.url} className="link-accent mt-4 inline-flex items-center gap-1 text-sm">
                    {p.url.replace(/^https?:\/\//, "").slice(0, 70)}
                    <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                  </ExternalLink>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}

      {tab === "law" ? (
        <div className="no-print grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="section-title mb-2.5">{c.statutes}</h2>
            <ul className="list">
              {memo.statutes.map((s, i) => (
                <li key={i} className="px-4 py-3.5">
                  <p className="font-medium">{s.name}</p>
                  {s.sections ? <p className="mono mt-0.5 text-muted">{s.sections}</p> : null}
                  {s.why ? <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.why}</p> : null}
                  {s.url ? (
                    <ExternalLink href={s.url} className="link-accent mt-1.5 inline-block text-xs">
                      {s.url.replace(/^https?:\/\//, "")}
                    </ExternalLink>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="section-title mb-2.5">{c.doctrines}</h2>
            <ul className="list">
              {memo.doctrines.map((d, i) => (
                <li key={i} className="px-4 py-3.5">
                  <p className="font-serif text-[1.0625rem] italic">{d.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{d.explanation}</p>
                  {d.leadingCase ? <p className="mono mt-1.5 text-subtle">{d.leadingCase}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "args" ? (
        <div className="no-print grid gap-6 lg:grid-cols-3">
          <ArgCol title={c.forSide} items={memo.argumentsFor} />
          <ArgCol title={c.against} items={memo.argumentsAgainst} />
          <ArgCol title={c.counters} items={memo.counters} />
          <section className="card card-pad lg:col-span-2">
            <h2 className="section-title">{c.strategy}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{memo.strategy}</p>
          </section>
          <section className="card card-pad">
            <h2 className="section-title">{c.risks}</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-muted">
              {memo.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {tab === "sources" ? (
        <div className="no-print flex max-w-3xl flex-col gap-6">
          <section>
            <h2 className="section-title mb-2.5">{c.tabSources}</h2>
            <ul className="list">
              {memo.sources.map((s, i) => (
                <li key={i} className="px-4 py-3">
                  <ExternalLink href={s.url} className="link-accent text-sm">
                    {s.title || s.url}
                  </ExternalLink>
                  <p className="mt-0.5 text-xs text-muted [overflow-wrap:anywhere]">
                    {[s.publisher, s.url ? s.url.replace(/^https?:\/\//, "") : ""].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
              {memo.citationUrls
                .filter((u) => !memo.sources.some((s) => s.url === u))
                .map((u) => (
                  <li key={u} className="px-4 py-3">
                    <ExternalLink href={u} className="link-accent text-sm">
                      {u.replace(/^https?:\/\//, "")}
                    </ExternalLink>
                  </li>
                ))}
            </ul>
          </section>
          {memo.searchedQueries.length > 0 ? (
            <section>
              <h2 className="label-sm mb-2">{c.searched}</h2>
              <ul className="tag-list">
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

      <article className="print-only print-paper">
        <pre className="whitespace-pre-wrap font-serif text-[15px] leading-[1.6]">{formatMemoBrief(memo, lang)}</pre>
      </article>

      <p className="no-print fineprint max-w-2xl">{c.disclaimer}</p>
    </div>
  );
}

function ArgCol({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card card-pad">
      <h2 className="section-title">{title}</h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span className="text-xs font-semibold tabular-nums text-fg">{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
