import { useMemo, useState } from "react";
import { Check, Circle, LoaderCircle, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/segmented";
import { COURT_SOURCES, courtSourceById } from "@/lib/court-import/courts";
import { continueCaseImport, startCaseImport, syncMatterFromCourt } from "@/lib/court-import/store";
import type { ImportJobView } from "@/lib/court-import/types";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";
import { extractUploads } from "@/lib/research/files";
import { fileToBase64 } from "@/lib/read-file";

function emptyLookup(courtId: string): Record<string, string> {
  const src = courtSourceById(courtId);
  const lookup: Record<string, string> = {};
  for (const field of src?.fields ?? []) lookup[field.id] = "";
  return lookup;
}

export function CourtImportPanel({
  lang,
  matterId,
  defaultCourtId,
  seed,
  onComplete,
}: {
  lang: OutputLang;
  matterId?: string;
  defaultCourtId?: string;
  seed?: Record<string, string>;
  onComplete: (job: ImportJobView) => void;
}) {
  const c = p(lang);
  const [courtId, setCourtId] = useState(defaultCourtId || COURT_SOURCES[0].id);
  const [lookup, setLookup] = useState<Record<string, string>>(() => ({
    ...emptyLookup(defaultCourtId || COURT_SOURCES[0].id),
    ...seed,
  }));
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<ImportJobView | null>(null);
  const [paste, setPaste] = useState("");
  const court = useMemo(() => courtSourceById(courtId) ?? COURT_SOURCES[0], [courtId]);

  function onCourtChange(id: string) {
    setCourtId(id);
    setLookup({ ...emptyLookup(id), ...seed });
    setJob(null);
  }

  async function fetchCase() {
    setBusy(true);
    try {
      const next = matterId && !Object.values(lookup).some((v) => v.trim())
        ? await syncMatterFromCourt({ data: { matterId } })
        : await startCaseImport({
            data: { courtId, lookup, matterId },
          });
      setJob(next);
      if (next.status === "FAILED") toast.error(next.error || c.failedImport);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.failedImport);
    } finally {
      setBusy(false);
    }
  }

  async function continuePaste() {
    if (!job) return;
    const text = paste.trim();
    if (text.length < 40) {
      toast.error(c.pasteCourtHint);
      return;
    }
    setBusy(true);
    try {
      const next = await continueCaseImport({ data: { importId: job.id, pastedText: text } });
      setJob(next);
      if (next.status === "FAILED") toast.error(next.error || c.failedImport);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : c.failedImport);
    } finally {
      setBusy(false);
    }
  }

  async function onFiles(list: FileList | null) {
    const files = [...(list ?? [])].slice(0, 3);
    if (!files.length || !job) return;
    setBusy(true);
    try {
      const extracted = await extractUploads({
        data: {
          files: await Promise.all(
            files.map(async (f) => ({
              name: f.name,
              mime: f.type,
              base64: await fileToBase64(f),
            })),
          ),
        },
      });
      if (!extracted.ok) {
        toast.error(c.failedAi);
        return;
      }
      const text = String(extracted.combined || "").trim();
      if (text.length < 40) {
        toast.error(c.parseErr);
        return;
      }
      setPaste((cur) => (cur ? `${cur}\n\n${text}` : text));
    } catch {
      toast.error(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  const done = job && (job.status === "COMPLETED" || job.status === "PARTIAL");

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-relaxed text-muted">{c.importHint}</p>
      <Field>
        <Label htmlFor="court-source">{c.courtName}</Label>
        <Select
          id="court-source"
          value={courtId}
          onChange={(e) => onCourtChange(e.target.value)}
          disabled={busy || job?.status === "CAPTCHA_REQUIRED"}
        >
          {COURT_SOURCES.map((src) => (
            <option key={src.id} value={src.id}>
              {lang === "hi" ? src.nameHi : src.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {court.fields.map((field) => (
          <Field key={field.id} className={field.id === "cnr" ? "sm:col-span-2" : ""}>
            <Label htmlFor={`imp-${field.id}`}>{lang === "hi" ? field.labelHi : field.label}</Label>
            <Input
              id={`imp-${field.id}`}
              value={lookup[field.id] ?? ""}
              placeholder={field.placeholder}
              onChange={(e) => setLookup({ ...lookup, [field.id]: e.target.value })}
              disabled={busy}
            />
            {field.hint ? <Hint>{lang === "hi" ? field.hintHi : field.hint}</Hint> : null}
          </Field>
        ))}
      </div>
      <Hint>{lang === "hi" ? court.demoHintHi : court.demoHint}</Hint>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void fetchCase()} disabled={busy || Boolean(done) || job?.status === "CAPTCHA_REQUIRED"}>
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {matterId ? c.syncingCase : c.fetchingCase}
            </>
          ) : matterId ? (
            c.syncCase
          ) : (
            c.fetchCase
          )}
        </Button>
      </div>

      {job ? <ImportProgress job={job} lang={lang} /> : null}

      {job?.status === "CAPTCHA_REQUIRED" ? (
        <div className="space-y-3 rounded-lg bg-elevated p-4 shadow-hairline">
          <div className="text-sm font-medium">{c.captchaTitle}</div>
          <p className="text-sm leading-relaxed text-muted">{c.captchaHint}</p>
          <a
            href={job.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-accent hover:underline"
          >
            {c.openCourtSite}
            <SquareArrowOutUpRight className="size-4" aria-hidden />
          </a>
          <Field>
            <Label htmlFor="court-paste">{c.pasteCourtResult}</Label>
            <Textarea
              id="court-paste"
              className="min-h-36"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={c.pasteCourtHint}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void continuePaste()} disabled={busy}>
              {c.continueImport}
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center rounded-md px-3 text-sm text-muted hover:text-fg">
              {c.uploadPaper}
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*,.html,.htm"
                multiple
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      ) : null}

      {done && job ? <ImportSummaryCard job={job} lang={lang} onReview={() => onComplete(job)} /> : null}
    </div>
  );
}

function ImportProgress({ job, lang }: { job: ImportJobView; lang: OutputLang }) {
  const c = p(lang);
  return (
    <ol className="space-y-2">
      {job.steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2 text-sm">
          {step.done ? (
            <Check className="mt-0.5 size-4 text-ok" aria-hidden />
          ) : step.active ? (
            <LoaderCircle className="mt-0.5 size-4 animate-spin text-accent" aria-hidden />
          ) : (
            <Circle className="mt-0.5 size-4 text-subtle" aria-hidden />
          )}
          <span className={step.active ? "text-fg" : "text-muted"}>{step.label}</span>
        </li>
      ))}
      {job.demo ? <li className="pt-1 text-xs leading-relaxed text-warn">{c.demoUsed}</li> : null}
    </ol>
  );
}

export function ImportSummaryCard({
  job,
  lang,
  onReview,
}: {
  job: ImportJobView;
  lang: OutputLang;
  onReview?: () => void;
}) {
  const c = p(lang);
  const s = job.summary;
  const preview = job.casePreview;
  const failed = job.records.filter((r) => r.status === "failed");
  return (
    <div className="space-y-3 rounded-lg bg-elevated p-4 shadow-hairline">
      <div className="text-sm font-medium">{c.importComplete}</div>
      {preview ? (
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted">{c.courtName}</dt>
            <dd>{preview.courtName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{c.caseNo}</dt>
            <dd className="tabular-nums">
              {preview.caseNumber} {preview.cnr}
            </dd>
          </div>
          {preview.parties ? (
            <div>
              <dt className="text-xs text-muted">{c.parties}</dt>
              <dd>{preview.parties}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted">{c.caseDetails}</dt>
            <dd>{s.caseDetails === "imported" ? "✓" : s.caseDetails}</dd>
          </div>
          {preview.nextHearingOn ? (
            <div>
              <dt className="text-xs text-muted">{c.nextHearing}</dt>
              <dd className="tabular-nums">{preview.nextHearingOn}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <ul className="space-y-1 text-sm text-muted">
        <li>
          {c.historicalRecords}: {s.found} {c.foundOrders} · {s.imported} {c.importedOrders}
          {s.duplicates ? ` · ${s.duplicates} ${c.alreadyOnFile}` : ""}
          {s.failed ? ` · ${s.failed} ${c.recordsUnavailable}` : ""}
        </li>
        <li>
          {c.timelineExtracted}: {s.timelineEvents}
        </li>
        <li>
          {c.deadlinesFound}: {s.deadlines}
        </li>
        {s.lastSyncedAt ? (
          <li>
            {c.lastSynced}: {String(s.lastSyncedAt).slice(0, 16).replace("T", " ")}
          </li>
        ) : null}
      </ul>
      {job.status === "PARTIAL" ? <p className="text-sm text-warn">{c.partialImport}</p> : null}
      {failed.length ? (
        <ul className="space-y-1 text-sm">
          {failed.map((r) => (
            <li key={r.id} className="text-warn">
              {r.title}
              {r.error ? ` — ${r.error}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {preview?.sourceUrl ? (
        <a
          href={preview.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 text-xs text-accent hover:underline"
        >
          {preview.sourceUrl.replace(/^https?:\/\//, "").slice(0, 48)}
          <SquareArrowOutUpRight className="size-3" aria-hidden />
        </a>
      ) : null}
      {onReview ? (
        <div className="pt-1">
          <Button type="button" onClick={onReview}>
            {c.reviewCase}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function NewMatterModeToggle({
  lang,
  mode,
  onChange,
}: {
  lang: OutputLang;
  mode: "manual" | "import";
  onChange: (mode: "manual" | "import") => void;
}) {
  const c = p(lang);
  return (
    <Segmented
      ariaLabel={c.newMatter}
      value={mode}
      onChange={onChange}
      options={[
        { value: "manual", label: c.enterManually },
        { value: "import", label: c.importFromCourt },
      ]}
    />
  );
}
