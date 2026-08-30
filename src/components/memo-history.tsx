import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { t } from "@/lib/research/copy";
import { courtById } from "@/lib/research/courts";
import { threadsMatchingQuery } from "@/lib/research/history-search";
import type { HistoryItem, OutputLang } from "@/lib/research/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

function subtitle(item: HistoryItem, lang: OutputLang): string {
  const court = courtById(item.intake.courtId);
  const courtName = lang === "hi" ? court.nameHi : court.name;
  const cause = item.memo.causeTitle.trim();
  return [cause, court.kind === "all" ? "" : courtName].filter(Boolean).join(" · ");
}

export function MemoHistory({
  lang,
  items,
  query,
  onQuery,
  onOpen,
  onDelete,
  onBack,
}: {
  lang: OutputLang;
  items: HistoryItem[];
  query: string;
  onQuery: (q: string) => void;
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const c = t(lang);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const threads = threadsMatchingQuery(items, query);
  const searching = query.trim().length >= 2;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {c.back}
          </button>
          <h1 className="font-display text-3xl">{c.history}</h1>
        </div>
        <Button variant="outline" onClick={onBack}>
          {c.newBrief}
        </Button>
      </div>

      {items.length > 0 || searching ? (
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={c.searchHistoryHint}
            aria-label={c.searchHistory}
            autoComplete="off"
            className="pl-10"
          />
        </div>
      ) : null}

      {items.length === 0 && !searching ? (
        <p className="text-sm text-muted">{c.emptyHistory}</p>
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted">{c.searchHistoryEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => (
            <li key={thread.root.id} className="overflow-hidden rounded-lg bg-surface shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              <MemoRow
                item={thread.root}
                lang={lang}
                locale={locale}
                followUpCount={thread.children.length}
                followUpsLabel={c.followUps}
                onOpen={onOpen}
                onDelete={onDelete}
                deleteLabel={c.deleteMemo}
              />
              {thread.children.length > 0 ? (
                <ul className="border-t border-[rgb(255_255_255/0.08)]">
                  {thread.children.map((child) => (
                    <li key={child.id}>
                      <MemoRow
                        item={child}
                        lang={lang}
                        locale={locale}
                        nested
                        followUpLabel={c.followUp}
                        onOpen={onOpen}
                        onDelete={onDelete}
                        deleteLabel={c.deleteMemo}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MemoRow({
  item,
  lang,
  locale,
  nested = false,
  followUpCount = 0,
  followUpLabel,
  followUpsLabel,
  onOpen,
  onDelete,
  deleteLabel,
}: {
  item: HistoryItem;
  lang: OutputLang;
  locale: string;
  nested?: boolean;
  followUpCount?: number;
  followUpLabel?: string;
  followUpsLabel?: string;
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  deleteLabel: string;
}) {
  const extra = subtitle(item, lang);
  return (
    <div className={`flex items-stretch ${nested ? "bg-elevated/40 pl-4" : ""}`}>
      <button type="button" onClick={() => onOpen(item)} className="min-w-0 flex-1 px-4 py-3 text-left">
        <div className="truncate font-medium">{item.title}</div>
        <div className="mt-1 truncate text-xs text-muted">
          {new Date(item.createdAt).toLocaleString(locale)}
          {nested && followUpLabel ? ` · ${followUpLabel}` : ""}
          {!nested && followUpCount > 0 && followUpsLabel ? ` · ${followUpCount} ${followUpsLabel}` : ""}
          {extra ? ` · ${extra}` : ""}
        </div>
      </button>
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center text-muted hover:text-danger"
        aria-label={deleteLabel}
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
