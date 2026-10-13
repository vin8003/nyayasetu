import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CornerDownRight, FolderOpen, Search, Trash2 } from "lucide-react";
import { t } from "@/lib/research/copy";
import { courtById } from "@/lib/research/courts";
import { threadsMatchingQuery } from "@/lib/research/history-search";
import type { HistoryItem, OutputLang } from "@/lib/research/types";
import { formatDay } from "@/lib/dates";
import { ConfirmDialog } from "@/components/ui/confirm";
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
  matterTitles,
  onQuery,
  onOpen,
  onDelete,
}: {
  lang: OutputLang;
  items: HistoryItem[];
  query: string;
  matterTitles: Record<string, string>;
  onQuery: (q: string) => void;
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const c = t(lang);
  const threads = threadsMatchingQuery(items, query);
  const searching = query.trim().length >= 2;
  const [pendingDelete, setPendingDelete] = useState<HistoryItem | null>(null);

  return (
    <section>
      {items.length > 0 || searching ? (
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={`${c.searchHistoryHint}…`}
            aria-label={c.searchHistory}
            autoComplete="off"
            className="pl-9"
          />
        </div>
      ) : null}

      {items.length === 0 && !searching ? (
        <div className="empty max-w-xl">
          <span className="empty-icon" aria-hidden>
            <BookOpen className="size-[1.125rem]" />
          </span>
          <p className="empty-title">{c.tabHistory}</p>
          <p className="empty-text">{c.emptyHistory}</p>
        </div>
      ) : threads.length === 0 ? (
        <p className="text-sm text-muted">{c.searchHistoryEmpty}</p>
      ) : (
        <ul className="list max-w-4xl">
          {threads.map((thread) => (
            <li key={thread.root.id}>
              <MemoRow item={thread.root} lang={lang} matterTitles={matterTitles} followUps={thread.children.length} onOpen={onOpen} onDelete={setPendingDelete} />
              {thread.children.map((child) => (
                <MemoRow key={child.id} item={child} lang={lang} matterTitles={matterTitles} nested onOpen={onOpen} onDelete={setPendingDelete} />
              ))}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (open ? null : setPendingDelete(null))}
        title={`${c.deleteMemo}: ${pendingDelete?.title ?? ""}`}
        text={c.deleteConfirm}
        confirmLabel={c.deleteMemo}
        cancelLabel={c.cancel}
        danger
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

function MemoRow({
  item,
  lang,
  matterTitles,
  nested = false,
  followUps = 0,
  onOpen,
  onDelete,
}: {
  item: HistoryItem;
  lang: OutputLang;
  matterTitles: Record<string, string>;
  nested?: boolean;
  followUps?: number;
  onOpen: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
}) {
  const c = t(lang);
  const extra = subtitle(item, lang);
  const matterTitle = item.matterId ? matterTitles[item.matterId] : "";
  return (
    <div className={`flex items-center ${nested ? "border-t border-border bg-bg/60 pl-6" : ""}`}>
      <button type="button" onClick={() => onOpen(item)} className="list-row min-w-0 flex-1">
        {nested ? <CornerDownRight className="size-4 shrink-0 text-subtle" aria-hidden /> : <BookOpen className="size-4 shrink-0 text-subtle" aria-hidden />}
        <span className="list-main">
          <span className="list-title block truncate">{item.title}</span>
          <span className="list-meta">
            <span>{formatDay(item.createdAt, lang)}</span>
            {nested ? <span>{c.followUp}</span> : null}
            {!nested && followUps > 0 ? (
              <span>
                {followUps} {c.followUps}
              </span>
            ) : null}
            {extra ? <span className="truncate">{extra}</span> : null}
          </span>
        </span>
      </button>
      {matterTitle && item.matterId ? (
        <Link
          to="/matters/$id"
          params={{ id: item.matterId }}
          search={{ tab: "research" }}
          className="hidden max-w-56 shrink-0 items-center gap-1.5 truncate rounded-md px-2 py-1 text-[0.8125rem] text-muted hover:bg-elevated hover:text-fg md:inline-flex"
          title={matterTitle}
        >
          <FolderOpen className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{matterTitle}</span>
        </Link>
      ) : null}
      <button
        type="button"
        className="mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-danger"
        aria-label={`${c.deleteMemo}: ${item.title}`}
        onClick={() => onDelete(item)}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
