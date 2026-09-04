import { useMemo, useState } from "react";
import { Check, Circle, LoaderCircle, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select } from "@/components/ui/field";
import { Segmented } from "@/components/segmented";
import { COURT_SOURCES, courtSourceById } from "@/lib/court-import/courts";
import { matchDelhiHcDemo, matchDistrictDemo } from "@/lib/court-import/fixtures";
import { startCaseImport } from "@/lib/court-import/store";
import type { ImportJobView } from "@/lib/court-import/types";
import { fetchCnrToInbox } from "@/lib/eci-partner/store";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";

function emptyLookup(courtId: string): Record<string, string> {
  const src = courtSourceById(courtId);
  const lookup: Record<string, string> = {};
  for (const field of src?.fields ?? []) lookup[field.id] = "";
  return lookup;
}

function isPublishedDemo(lookup: Record<string, string>) {
  return Boolean(matchDistrictDemo(lookup) || matchDelhiHcDemo(lookup));
}

export function CourtImportPanel({
  lang,
  matterId,
  defaultCourtId,
  seed,
  sample = false,
  showCnrFetch = true,
  onComplete,
}: {
  lang: OutputLang;
  matterId?: string;
  defaultCourtId?: string;
  seed?: Record<string, string>;
  sample?: boolean;
  showCnrFetch?: boolean;
  onComplete: (result: { matterId: string | null }) => void;
}) {
  const c = p(lang);
  const [courtId, setCourtId] = useState(defaultCourtId || COURT_SOURCES[0].id);
  const [lookup, setLookup] = useState<Record<string, string>>(() => ({
    ...emptyLookup(defaultCourtId || COURT_SOURCES[0].id),
    ...seed,
  }));
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<ImportJobView | null>(null);
  const court = useMemo(() => courtSourceById(courtId) ?? COURT_SOURCES[0], [courtId]);

  function onCourtChange(id: string) {
    setCourtId(id);
    setLookup({ ...emptyLookup(id), ...seed });
    setJob(null);
  }

  async function fetchCase() {
    const demo = isPublishedDemo(lookup);
    const cnr = (lookup.cnr || seed?.cnr || "").trim();
    if (!demo) {
      if (!cnr) {
        toast.error(c.eciNeedCnr);
        return;
      }
      setBusy(true);
      try {
        const next = await fetchCnrToInbox({ data: { matterId, cnr } });
        if (!next.ok) {
          toast.error(next.message || c.eciFetchError);
          return;
        }
        toast.success(`${c.eciLanded}: ${next.landed}`);
        onComplete({ matterId: next.matterId });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : c.eciFetchError);
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const next = await startCaseImport({
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

  const done = job && (job.status === "COMPLETED" || job.status === "PARTIAL");

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-relaxed text-muted">{c.importHint}</p>
      {showCnrFetch ? (
        <>
          <EciCnrFetch
            lang={lang}
            matterId={matterId}
            defaultCnr={lookup.cnr || seed?.cnr || ""}
            compact
            sample={sample}
            onLanded={(landed) => {
              if (landed.cnr) setLookup((cur) => ({ ...cur, cnr: landed.cnr }));
              onComplete({ matterId: landed.matterId });
            }}
          />
          <p className="text-xs text-subtle">{c.eciPartnerNotCaptcha}</p>
        </>
      ) : (
        <p className="text-xs text-subtle">{c.eciPartnerNotCaptcha}</p>
      )}
      <Field>
        <Label htmlFor="court-source">{c.courtName}</Label>
        <Select id="court-source" value={courtId} onChange={(e) => onCourtChange(e.target.value)} disabled={busy}>
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
        <Button type="button" onClick={() => void fetchCase()} disabled={busy || Boolean(done) || sample}>
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

      {done && job ? <ImportSummaryCard job={job} lang={lang} onReview={() => onComplete({ matterId: job.matterId })} /> : null}
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
      {preview?.sourceUrl && !/ecourts\.gov\.in/i.test(preview.sourceUrl) ? (
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
