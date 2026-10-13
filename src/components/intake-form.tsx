import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, FolderOpen, Paperclip, Search, X } from "lucide-react";
import { COURTS } from "@/lib/research/courts";
import { PRACTICE_AREAS, type HistoryItem, type Intake, type OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { formatDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const SOURCES = [
  { name: "Supreme Court of India", href: "https://www.sci.gov.in/" },
  { name: "eSCR (all High Courts)", href: "https://judgments.ecourts.gov.in/" },
  { name: "Indian Kanoon", href: "https://indiankanoon.org/" },
  { name: "LiveLaw", href: "https://www.livelaw.in/" },
  { name: "CaseMine", href: "https://www.casemine.com/" },
];

export type PendingFile = {
  name: string;
  mime: string;
  size: number;
  file: File;
};

export function IntakeForm({
  intake,
  lang,
  busy,
  error,
  files,
  matter,
  recent,
  onChange,
  onSubmit,
  onFiles,
  onOpenMemo,
}: {
  intake: Intake;
  lang: OutputLang;
  busy: boolean;
  error: string | null;
  files: PendingFile[];
  matter?: { id: string; title: string } | null;
  recent: HistoryItem[];
  onChange: (next: Intake) => void;
  onSubmit: () => void;
  onFiles: (next: PendingFile[]) => void;
  onOpenMemo: (item: HistoryItem) => void;
}) {
  const c = t(lang);
  const set = (patch: Partial<Intake>) => onChange({ ...intake, ...patch });
  const length = intake.facts.trim().length;
  const ready = files.length > 0 || length >= 40;

  return (
    <div className="split">
      <form
        className="flex min-w-0 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {matter ? (
          <p className="callout !py-2 text-[0.8125rem]">
            <FolderOpen className="size-4 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              {c.forMatter}{" "}
              <Link to="/matters/$id" params={{ id: matter.id }} className="font-medium text-fg hover:underline">
                {matter.title}
              </Link>
              <span className="text-muted">
                {" "}
                · {lang === "hi" ? "तथ्य फ़ाइल से भरे गए हैं" : "facts filled in from the file"}
              </span>
            </span>
          </p>
        ) : null}

        <Field>
          <Label htmlFor="facts">{c.facts}</Label>
          <div className="composer">
            <textarea
              id="facts"
              name="facts"
              value={intake.facts}
              onChange={(e) => set({ facts: e.target.value })}
              placeholder={c.factsPlaceholder}
              disabled={busy}
              aria-describedby="facts-hint"
            />
            {files.length > 0 ? (
              <ul className="composer-files">
                {files.map((f) => (
                  <li key={f.name + f.size} className="file-pill">
                    <Paperclip className="size-3.5 text-subtle" aria-hidden />
                    <span className="max-w-48 truncate">{f.name}</span>
                    <span className="text-xs text-subtle">{Math.ceil(f.size / 1024)} KB</span>
                    <button
                      type="button"
                      className="grid size-6 place-items-center rounded text-muted hover:bg-raised hover:text-fg"
                      onClick={() => onFiles(files.filter((x) => x !== f))}
                      aria-label={`${c.removeFile}: ${f.name}`}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="composer-bar">
              <label className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[0.8125rem] font-medium text-muted hover:bg-elevated hover:text-fg">
                <Paperclip className="size-4" aria-hidden />
                {c.attach}
                <input
                  type="file"
                  className="sr-only"
                  disabled={busy || files.length >= 3}
                  multiple
                  accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.csv,application/pdf,image/*,text/plain"
                  onChange={(e) => {
                    const list = [...(e.target.files ?? [])];
                    const next = [...files];
                    for (const file of list) {
                      if (next.length >= 3) break;
                      if (file.size > 1_200_000) continue;
                      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
                      next.push({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, file });
                    }
                    onFiles(next);
                    e.target.value = "";
                  }}
                />
              </label>
              {files.length === 0 ? (
                <span className={cn("text-xs tabular-nums", length >= 40 ? "text-muted" : "text-subtle")} aria-live="polite">
                  {c.factsCount.replace("{n}", String(length))}
                </span>
              ) : null}
            </div>
          </div>
          <p id="facts-hint" className="text-[0.8125rem] leading-snug text-muted">
            {c.factsHint} {c.filesHint}
          </p>
        </Field>

        <Field>
          <Label htmlFor="query">{c.questionOptional}</Label>
          <Input
            id="query"
            name="query"
            autoComplete="off"
            value={intake.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={c.queryHint}
            disabled={busy}
          />
        </Field>

        <div className="settings-row">
          <Field>
            <Label htmlFor="court">{c.court}</Label>
            <Select id="court" value={intake.courtId} onChange={(e) => set({ courtId: e.target.value })} disabled={busy}>
              {COURTS.map((court) => (
                <option key={court.id} value={court.id}>
                  {lang === "hi" ? court.nameHi : court.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="area">{c.area}</Label>
            <Select id="area" value={intake.area} onChange={(e) => set({ area: e.target.value as Intake["area"] })} disabled={busy}>
              {PRACTICE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {c.areas[area]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="side">{c.side}</Label>
            <Select id="side" value={intake.side} onChange={(e) => set({ side: e.target.value as Intake["side"] })} disabled={busy}>
              {(["petitioner", "respondent", "neutral"] as const).map((side) => (
                <option key={side} value={side}>
                  {c.sides[side]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="memo-lang">{c.memoLang}</Label>
            <Select id="memo-lang" value={intake.lang} onChange={(e) => set({ lang: e.target.value as OutputLang })} disabled={busy}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </Select>
          </Field>
        </div>

        {error ? (
          <p className="callout is-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" size="lg" disabled={busy || !ready}>
            <Search className="size-4" aria-hidden />
            {busy ? c.researching : c.research}
          </Button>
          <p className="text-[0.8125rem] text-muted">{c.runHint}</p>
        </div>
      </form>

      <aside className="split-aside flex min-w-0 flex-col gap-6">
        <section>
          <div className="section-head">
            <h2 className="section-title">{c.recentMemos}</h2>
            {recent.length > 0 ? (
              <Link to="/research" search={{ view: "history" }} className="link-quiet text-[0.8125rem]">
                {c.tabHistory}
              </Link>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">{c.noRecent}</p>
          ) : (
            <ul className="list">
              {recent.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <button type="button" className="list-row !min-h-11 !py-2.5" onClick={() => onOpenMemo(item)}>
                    <BookOpen className="size-4 shrink-0 text-subtle" aria-hidden />
                    <span className="list-main">
                      <span className="list-title block truncate !text-sm">{item.title}</span>
                      <span className="list-meta !text-xs">
                        <span>{formatDay(item.createdAt, lang)}</span>
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-subtle" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="section-title mb-1.5">{c.sourcesLabel}</h2>
          <ul className="flex flex-col">
            {SOURCES.map((src) => (
              <li key={src.href}>
                <a href={src.href} target="_blank" rel="noreferrer" className="link-quiet inline-flex min-h-8 items-center text-[0.8125rem]">
                  {src.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
