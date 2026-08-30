import { Scale, Landmark, BookOpen, Search, Paperclip, X } from "lucide-react";
import { COURTS } from "@/lib/research/courts";
import { PRACTICE_AREAS, type Intake, type OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { SAMPLES, type SampleBrief } from "@/lib/research/samples";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/segmented";

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

function applySampleToDesk(next: Intake, onSample: (next: Intake) => void) {
  onSample(next);
  window.setTimeout(() => {
    const el = document.getElementById("facts");
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.setCustomValidity("");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, 50);
}

function SampleButtons({
  lang,
  busy,
  compact,
  onPick,
}: {
  lang: OutputLang;
  busy: boolean;
  compact?: boolean;
  onPick: (sample: SampleBrief) => void;
}) {
  const c = t(lang);
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">{c.samples}</h2>
      <div className="flex flex-col gap-2">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(sample)}
            className="min-h-11 touch-manipulation rounded-lg bg-surface px-4 py-3 text-left shadow-[0_0_0_1px_rgb(255_255_255/0.08)] transition-[box-shadow,background-color] duration-150 active:bg-elevated lg:hover:shadow-[0_0_0_1px_rgb(255_255_255/0.14)] disabled:opacity-50"
          >
            <div className="text-sm font-medium text-fg">{lang === "hi" ? sample.titleHi : sample.titleEn}</div>
            {compact ? null : (
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {lang === "hi" ? sample.blurbHi : sample.blurbEn}
              </p>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

export function IntakeForm({
  intake,
  lang,
  busy,
  error,
  files,
  onChange,
  onSubmit,
  onSample,
  onFiles,
}: {
  intake: Intake;
  lang: OutputLang;
  busy: boolean;
  error: string | null;
  files: PendingFile[];
  onChange: (next: Intake) => void;
  onSubmit: () => void;
  onSample: (next: Intake) => void;
  onFiles: (next: PendingFile[]) => void;
}) {
  const c = t(lang);
  const set = (patch: Partial<Intake>) => onChange({ ...intake, ...patch });

  function pickSample(sample: SampleBrief) {
    applySampleToDesk({ ...sample.intake, lang: intake.lang }, onSample);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-10">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field>
          <Label htmlFor="facts">{c.facts}</Label>
          <Textarea
            id="facts"
            name="facts"
            required={files.length === 0}
            minLength={files.length === 0 ? 40 : undefined}
            value={intake.facts}
            onChange={(e) => set({ facts: e.target.value })}
            placeholder={c.factsHint}
            disabled={busy}
          />
          <Hint>{c.factsHint}</Hint>
        </Field>

        <div className="lg:hidden">
          <SampleButtons lang={lang} busy={busy} compact onPick={pickSample} />
        </div>

        <Field>
          <span className="block text-sm font-medium tracking-tight text-fg/90">{c.files}</span>
          <label
            htmlFor="docs"
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-elevated px-3.5 text-sm text-muted shadow-[0_0_0_1px_rgb(255_255_255/0.08)] hover:text-fg"
          >
            <Paperclip className="size-4 shrink-0" />
            PDF · JPG · TXT
          </label>
          <input
            id="docs"
            name="docs"
            type="file"
            className="sr-only"
            disabled={busy}
            multiple
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp,.csv,application/pdf,image/*,text/plain"
            suppressHydrationWarning
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
          {files.length > 0 ? (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li
                  key={f.name + f.size}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {f.name}
                    <span className="ml-2 text-xs text-subtle">{Math.ceil(f.size / 1024)} KB</span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex size-8 items-center justify-center text-muted hover:text-fg"
                    onClick={() => onFiles(files.filter((x) => x !== f))}
                    aria-label={c.removeFile}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Hint>{c.filesHint}</Hint>
        </Field>

        <Field>
          <Label htmlFor="query">{c.query}</Label>
          <Input
            id="query"
            name="query"
            value={intake.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder={c.queryHint}
            disabled={busy}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="court">{c.court}</Label>
            <Select
              id="court"
              value={intake.courtId}
              onChange={(e) => set({ courtId: e.target.value })}
              disabled={busy}
            >
              {COURTS.map((court) => (
                <option key={court.id} value={court.id}>
                  {lang === "hi" ? court.nameHi : court.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="area">{c.area}</Label>
            <Select
              id="area"
              value={intake.area}
              onChange={(e) => set({ area: e.target.value as Intake["area"] })}
              disabled={busy}
            >
              {PRACTICE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {c.areas[area]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field>
          <Label>{c.side}</Label>
          <Segmented
            ariaLabel={c.side}
            value={intake.side}
            onChange={(side) => set({ side })}
            options={[
              { value: "petitioner", label: c.sides.petitioner },
              { value: "respondent", label: c.sides.respondent },
              { value: "neutral", label: c.sides.neutral },
            ]}
          />
        </Field>

        <Field>
          <Label>{c.memoLang}</Label>
          <Segmented
            ariaLabel={c.memoLang}
            value={intake.lang}
            onChange={(next) => set({ lang: next })}
            options={[
              { value: "hi", label: "हिन्दी" },
              { value: "en", label: "English" },
            ]}
          />
        </Field>

        {error ? (
          <p className="rounded-md bg-danger/10 px-3.5 py-3 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={busy} className="w-full touch-manipulation sm:w-auto sm:self-start">
          <Search className="size-4" />
          {busy ? c.researching : c.research}
        </Button>
      </form>

      <aside className="flex flex-col gap-6">
        <section className="rounded-xl bg-surface p-5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
          <h2 className="font-display text-lg font-medium tracking-tight">{c.how}</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {[c.step1, c.step2, c.step3, c.step4].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-elevated font-mono text-[11px] text-accent">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="hidden lg:block">
          <SampleButtons lang={lang} busy={busy} onPick={pickSample} />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">{c.sourcesLabel}</h2>
          <ul className="space-y-2">
            {SOURCES.map((src, i) => {
              const Icon = i === 0 ? Landmark : i === 2 ? BookOpen : Scale;
              return (
                <li key={src.href}>
                  <a
                    href={src.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-accent hover:text-fg"
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {src.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      </aside>
    </div>
  );
}
