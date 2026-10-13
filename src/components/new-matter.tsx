import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { SlideOver } from "@/components/ui/slide-over";
import { onNewMatter, refreshCounts, type NewMatterRequest } from "@/lib/app-events";
import { p, sideLabel } from "@/lib/practice/copy";
import { attachDraftToMatter, savePastedDocument, saveMatter } from "@/lib/practice/store";
import { OUR_SIDES, PROCEEDINGS } from "@/lib/practice/types";
import { defaultStage, proceedingDef, stagesFor } from "@/lib/practice/workflow";
import { linkMemoToMatter } from "@/lib/research/store";
import type { OutputLang } from "@/lib/research/types";

type Draft = {
  title: string;
  clientName: string;
  proceeding: string;
  stage: string;
  courtName: string;
  caseNumber: string;
  cnr: string;
  ourSide: string;
  partiesText: string;
  notes: string;
};

function blankDraft(prefill: NewMatterRequest["prefill"] = {}): Draft {
  const proceeding = prefill.proceeding && (PROCEEDINGS as readonly string[]).includes(prefill.proceeding) ? prefill.proceeding : "civil";
  return {
    title: prefill.title ?? "",
    clientName: "",
    proceeding,
    stage: defaultStage(proceeding),
    courtName: prefill.courtName ?? "",
    caseNumber: prefill.caseNumber ?? "",
    cnr: prefill.cnr ?? "",
    ourSide: prefill.ourSide && (OUR_SIDES as readonly string[]).includes(prefill.ourSide) ? prefill.ourSide : "petitioner",
    partiesText: "",
    notes: prefill.notes ?? "",
  };
}

/** Carries the memo and paper a request asked to file once the matter exists. */
export async function fileOnNewMatter(matterId: string, request: NewMatterRequest) {
  if (request.memoId) await linkMemoToMatter({ data: { memoId: request.memoId, matterId } });
  if (request.paper && request.paper.body.trim().length >= 20) {
    const body = request.paper.body.slice(0, 40000);
    const title = request.paper.title.slice(0, 240) || "Paper";
    if (request.paper.aiDraft) {
      await attachDraftToMatter({ data: { matterId, title, kind: request.paper.kind, body } });
    } else {
      await savePastedDocument({ data: { matterId, title, body, kind: request.paper.kind, sourceKind: "paste" } });
    }
  }
}

/** The shell-wide "new matter" panel. Any screen opens it with openNewMatter(). */
export function NewMatterPanel({ lang }: { lang: OutputLang }) {
  const c = p(lang);
  const navigate = useNavigate();
  const [request, setRequest] = useState<NewMatterRequest | null>(null);
  const [mode, setMode] = useState<"cnr" | "manual">("cnr");
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(
    () =>
      onNewMatter((next) => {
        setRequest(next);
        setMode(next.mode ?? (next.prefill?.title ? "manual" : "cnr"));
        setDraft(blankDraft(next.prefill));
        setMore(Boolean(next.prefill?.notes));
        setTitleError("");
      }),
    [],
  );

  const open = request !== null;

  function close() {
    if (busy) return;
    setRequest(null);
  }

  async function finish(matter: { id: string; title: string }) {
    const req = request ?? {};
    try {
      await fileOnNewMatter(matter.id, req);
    } catch {
      toast.error(c.parseErr);
    }
    setRequest(null);
    refreshCounts();
    if (req.onCreated) req.onCreated(matter);
    if (!req.stay) navigate({ to: "/matters/$id", params: { id: matter.id } });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.title.trim().length < 2) {
      setTitleError(c.requiredTitle);
      return;
    }
    setBusy(true);
    try {
      const { id } = await saveMatter({
        data: { ...draft, title: draft.title.trim(), caseType: "", jurisdiction: "" },
      });
      toast.success(c.matterCreated);
      setBusy(false);
      await finish({ id, title: draft.title.trim() });
    } catch (err) {
      setBusy(false);
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(c.parseErr);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={close}
      title={c.newMatter}
      description={mode === "cnr" ? c.newMatterCnrLead : c.newMatterManualLead}
      closeLabel={c.close}
      footer={
        mode === "manual" ? (
          <>
            <Button variant="ghost" onClick={close} disabled={busy}>
              {c.cancel}
            </Button>
            <Button type="submit" form="new-matter-form" disabled={busy}>
              {busy ? c.savingEntry : c.createMatter}
            </Button>
          </>
        ) : null
      }
    >
      <Segmented
        ariaLabel={c.newMatter}
        value={mode}
        onChange={setMode}
        options={[
          { value: "cnr", label: c.byCnr },
          { value: "manual", label: c.byHand },
        ]}
      />

      {mode === "cnr" ? (
        <div className="mt-6 flex flex-col gap-5">
          <EciCnrFetch
            lang={lang}
            defaultCnr={draft.cnr}
            submitLabel={c.eciFetchAction}
            onLanded={(landed) => void finish({ id: landed.matterId, title: landed.preview?.title || landed.cnr })}
          />
          <dl className="guide border-t border-border pt-5">
            <dt>{c.cnrWhatHappens}</dt>
            <dd className="text-muted">{c.cnrWhatHappensBody}</dd>
            <dt>{c.cnrWhere}</dt>
            <dd className="text-muted">{c.cnrWhereBody}</dd>
            <dt>{c.cnrCoverage}</dt>
            <dd className="text-muted">{c.eciFetchScope}</dd>
          </dl>
        </div>
      ) : (
        <form id="new-matter-form" className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field>
            <Label htmlFor="nm-title">{c.matterTitle}</Label>
            <Input
              id="nm-title"
              name="title"
              autoComplete="off"
              value={draft.title}
              placeholder={c.matterTitlePlaceholder}
              aria-invalid={titleError ? true : undefined}
              onChange={(e) => {
                setDraft({ ...draft, title: e.target.value });
                if (titleError) setTitleError("");
              }}
            />
            {titleError ? <p className="field-error">{titleError}</p> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label htmlFor="nm-court">{c.courtName}</Label>
              <Input
                id="nm-court"
                name="court"
                autoComplete="off"
                value={draft.courtName}
                placeholder={c.courtPlaceholder}
                onChange={(e) => setDraft({ ...draft, courtName: e.target.value })}
              />
            </Field>
            <Field>
              <Label htmlFor="nm-case">{c.caseNo}</Label>
              <Input
                id="nm-case"
                name="caseNumber"
                autoComplete="off"
                value={draft.caseNumber}
                placeholder={c.caseNoPlaceholder}
                onChange={(e) => setDraft({ ...draft, caseNumber: e.target.value })}
              />
            </Field>
            <Field>
              <Label htmlFor="nm-proc">{c.proceeding}</Label>
              <Select
                id="nm-proc"
                value={draft.proceeding}
                onChange={(e) => {
                  const proceeding = e.target.value;
                  setDraft({ ...draft, proceeding, stage: defaultStage(proceeding) });
                }}
              >
                {PROCEEDINGS.map((id) => {
                  const d = proceedingDef(id);
                  return (
                    <option key={id} value={id}>
                      {lang === "hi" ? d.labelHi : d.label}
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="nm-side">{c.ourSide}</Label>
              <Select id="nm-side" value={draft.ourSide} onChange={(e) => setDraft({ ...draft, ourSide: e.target.value })}>
                {OUR_SIDES.map((s) => (
                  <option key={s} value={s}>
                    {sideLabel(lang, s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {more ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label htmlFor="nm-client">{c.client}</Label>
                  <Input
                    id="nm-client"
                    name="client"
                    autoComplete="off"
                    value={draft.clientName}
                    onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                  />
                </Field>
                <Field>
                  <Label htmlFor="nm-stage">{c.stage}</Label>
                  <Select id="nm-stage" value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })}>
                    {stagesFor(draft.proceeding).map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === "hi" ? s.labelHi : s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field>
                <Label htmlFor="nm-cnr">{c.cnr}</Label>
                <Input
                  id="nm-cnr"
                  name="cnr"
                  autoComplete="off"
                  spellCheck={false}
                  className="mono uppercase"
                  value={draft.cnr}
                  onChange={(e) => setDraft({ ...draft, cnr: e.target.value })}
                />
                <Hint>{c.cnrLaterHint}</Hint>
              </Field>
              <Field>
                <Label htmlFor="nm-parties">{c.parties}</Label>
                <Textarea
                  id="nm-parties"
                  className="min-h-24"
                  value={draft.partiesText}
                  placeholder={c.partiesPlaceholder}
                  onChange={(e) => setDraft({ ...draft, partiesText: e.target.value })}
                />
                <Hint>{c.partiesHint}</Hint>
              </Field>
              <Field>
                <Label htmlFor="nm-notes">{c.notes}</Label>
                <Textarea
                  id="nm-notes"
                  className="min-h-28"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </Field>
            </>
          ) : (
            <button type="button" className="link-accent self-start text-sm" onClick={() => setMore(true)}>
              {c.moreDetails}
            </button>
          )}
        </form>
      )}
    </SlideOver>
  );
}
