import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookmarkPlus, ChevronDown, FilePlus2, FolderPlus, Gavel, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label, Select } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { SlideOver } from "@/components/ui/slide-over";
import { openNewMatter, refreshCounts, type NewMatterPrefill } from "@/lib/app-events";
import { writeInboxDraft } from "@/lib/practice/inbox-draft";
import { p } from "@/lib/practice/copy";
import { addTask, attachDraftToMatter, listMatters, saveMatter, savePastedDocument } from "@/lib/practice/store";
import { defaultStage } from "@/lib/practice/workflow";
import { linkMemoToMatter } from "@/lib/research/store";
import type { OutputLang } from "@/lib/research/types";

type Mode = "memo" | "paper" | "task" | "order";
type MatterHit = { id: string; title: string; caseNumber?: string };

export type CaseSource = {
  /** Suggested title for a paper or task. */
  title: string;
  /** The text being filed. */
  body: string;
  /** True when the text came from the model, so the paper is marked as a draft to review. */
  aiDraft: boolean;
  /** Paper kind on the file. */
  kind?: string;
  /** Saved research memo, so the memo itself can be filed. */
  memoId?: string;
  /** Prefill for "new matter from this". */
  prefill?: NewMatterPrefill;
};

const NEW = "__new__";

function firstLine(text: string, max = 120) {
  const line = text.replace(/[#*_>`]/g, "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * "Add to case" for anything CiteBench writes: a memo, a court draft, an Ask
 * answer. Files it as a paper, turns it into a task, sends it to Inbox to be
 * read as an order, or opens a new matter from it.
 */
export function AddToCase({
  lang,
  source,
  matterId,
  variant = "outline",
  label,
  onFiled,
}: {
  lang: OutputLang;
  source: CaseSource;
  matterId?: string | null;
  variant?: "outline" | "ghost" | "primary";
  label?: ReactNode;
  onFiled?: (matterId: string) => void;
}) {
  const c = p(lang);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [matters, setMatters] = useState<MatterHit[] | null>(null);
  const [target, setTarget] = useState(matterId ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(source.kind ?? "other");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!mode) return;
    let live = true;
    listMatters()
      .then((rows) => {
        if (!live) return;
        const list = rows as MatterHit[];
        setMatters(list);
        setTarget((cur) => cur || matterId || list[0]?.id || NEW);
      })
      .catch(() => {
        if (live) setMatters([]);
      });
    return () => {
      live = false;
    };
  }, [mode, matterId]);

  function start(next: Mode) {
    setMode(next);
    setTarget(matterId ?? "");
    setNewTitle(source.prefill?.title ?? "");
    setTitle(next === "task" ? firstLine(source.title || source.body, 200) : source.title.slice(0, 240));
    setKind(source.kind ?? (next === "order" ? "order" : "other"));
    setDueOn("");
    setError("");
  }

  async function resolveMatter(): Promise<{ id: string; title: string } | null> {
    if (target !== NEW) {
      const hit = matters?.find((m) => m.id === target);
      return hit ? { id: hit.id, title: hit.title } : null;
    }
    const name = newTitle.trim();
    if (name.length < 2) {
      setError(c.requiredTitle);
      return null;
    }
    const prefill = source.prefill ?? {};
    const proceeding = prefill.proceeding ?? "civil";
    const { id } = await saveMatter({
      data: {
        title: name,
        clientName: "",
        proceeding,
        stage: defaultStage(proceeding),
        courtName: prefill.courtName ?? "",
        caseNumber: prefill.caseNumber ?? "",
        cnr: prefill.cnr ?? "",
        caseType: "",
        jurisdiction: "",
        ourSide: prefill.ourSide ?? "petitioner",
        partiesText: "",
        notes: prefill.notes ?? "",
      },
    });
    return { id, title: name };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mode) return;
    if ((mode === "paper" || mode === "task") && title.trim().length < 2) {
      setError(mode === "task" ? c.taskTitleNeeded : c.paperTitleNeeded);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const matter = await resolveMatter();
      if (!matter) return;
      if (mode === "memo" && source.memoId) {
        await linkMemoToMatter({ data: { memoId: source.memoId, matterId: matter.id } });
        toast.success(c.filedResearch.replace("{matter}", matter.title), {
          action: { label: c.openFile, onClick: () => navigate({ to: "/matters/$id", params: { id: matter.id }, search: { tab: "research" } }) },
        });
      } else if (mode === "paper") {
        const body = source.body.slice(0, 40000);
        const paperTitle = title.trim().slice(0, 240);
        const saved = source.aiDraft
          ? await attachDraftToMatter({ data: { matterId: matter.id, title: paperTitle, kind, body } })
          : await savePastedDocument({ data: { matterId: matter.id, title: paperTitle, body, kind, sourceKind: "paste" } });
        toast.success(
          (saved as { duplicate?: boolean })?.duplicate ? c.alreadyOnFile : c.paperFiled.replace("{matter}", matter.title),
          { action: { label: c.openFile, onClick: () => navigate({ to: "/matters/$id", params: { id: matter.id }, search: { tab: "papers" } }) } },
        );
      } else if (mode === "task") {
        const result = await addTask({ data: { matterId: matter.id, title: title.trim(), dueOn: dueOn || undefined, origin: "lawyer" } });
        toast.success(result?.duplicate ? c.alreadyOnFile : c.taskFiled.replace("{matter}", matter.title), {
          action: { label: c.openFile, onClick: () => navigate({ to: "/matters/$id", params: { id: matter.id }, search: { tab: "work" } }) },
        });
      } else if (mode === "order") {
        writeInboxDraft({ matterId: matter.id, body: source.body.slice(0, 40000), title: title.trim() || source.title });
        setMode(null);
        navigate({ to: "/inbox", search: { matter: matter.id } });
        return;
      }
      refreshCounts();
      onFiled?.(matter.id);
      setMode(null);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else setError(c.parseErr);
    } finally {
      setBusy(false);
    }
  }

  const heading: Record<Mode, string> = {
    memo: c.fileResearch,
    paper: c.saveAsPaper,
    task: c.makeTask,
    order: c.readAsOrderTitle,
  };
  const lead: Record<Mode, string> = {
    memo: c.fileResearchLead,
    paper: source.aiDraft ? c.saveAsPaperAiLead : c.saveAsPaperLead,
    task: c.makeTaskLead,
    order: c.readAsOrderLead,
  };
  const submit: Record<Mode, string> = {
    memo: c.fileResearchAction,
    paper: c.saveAsPaperAction,
    task: c.makeTaskAction,
    order: c.readAsOrderAction,
  };

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button variant={variant} size="sm">
            <FolderPlus className="size-4" aria-hidden />
            {label ?? c.addToCase}
            <ChevronDown className="size-3.5 opacity-60" aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent align="start">
          {source.memoId && !matterId ? (
            <MenuItem icon={<BookmarkPlus className="size-4" />} hint={c.fileResearchHint} onSelect={() => start("memo")}>
              {c.fileResearch}
            </MenuItem>
          ) : null}
          <MenuItem icon={<FilePlus2 className="size-4" />} hint={c.saveAsPaperHint} onSelect={() => start("paper")}>
            {c.saveAsPaper}
          </MenuItem>
          <MenuItem icon={<ListPlus className="size-4" />} hint={c.makeTaskHint} onSelect={() => start("task")}>
            {c.makeTask}
          </MenuItem>
          <MenuItem icon={<Gavel className="size-4" />} hint={c.readAsOrderHint} onSelect={() => start("order")}>
            {c.readAsOrderTitle}
          </MenuItem>
          {!matterId ? (
            <>
              <MenuSeparator />
              <MenuItem
                icon={<FolderPlus className="size-4" />}
                hint={c.newMatterFromThisHint}
                onSelect={() =>
                  openNewMatter({
                    mode: "manual",
                    prefill: source.prefill ?? { title: source.title },
                    memoId: source.memoId,
                    paper: source.memoId
                      ? undefined
                      : { title: source.title || c.paperTitle, body: source.body, kind: source.kind ?? "other", aiDraft: source.aiDraft },
                  })
                }
              >
                {c.newMatterFromThis}
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>

      <SlideOver
        open={mode !== null}
        onClose={() => (busy ? null : setMode(null))}
        title={mode ? heading[mode] : ""}
        description={mode ? lead[mode] : undefined}
        closeLabel={c.close}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              {c.cancel}
            </Button>
            <Button type="submit" form="add-to-case-form" disabled={busy || matters === null}>
              {busy ? c.savingEntry : mode ? submit[mode] : ""}
            </Button>
          </>
        }
      >
        <form id="add-to-case-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field>
            <Label htmlFor="atc-matter">{c.matterLabel}</Label>
            <Select id="atc-matter" value={target} onChange={(e) => setTarget(e.target.value)} disabled={matters === null}>
              {(matters ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.caseNumber ? ` · ${m.caseNumber}` : ""}
                </option>
              ))}
              <option value={NEW}>{c.newMatterOption}</option>
            </Select>
          </Field>
          {target === NEW ? (
            <Field>
              <Label htmlFor="atc-new">{c.matterTitle}</Label>
              <Input
                id="atc-new"
                autoComplete="off"
                value={newTitle}
                placeholder={c.matterTitlePlaceholder}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Hint>{c.newMatterInlineHint}</Hint>
            </Field>
          ) : null}

          {mode === "paper" || mode === "task" ? (
            <Field>
              <Label htmlFor="atc-title">{mode === "task" ? c.taskTitle : c.paperTitle}</Label>
              <Input id="atc-title" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          ) : null}

          {mode === "paper" ? (
            <Field>
              <Label htmlFor="atc-kind">{c.paperKind}</Label>
              <Select id="atc-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="pleading">{c.kindPleading}</option>
                <option value="notice">{c.kindNotice}</option>
                <option value="order">{c.kindOrder}</option>
                <option value="evidence">{c.kindEvidence}</option>
                <option value="other">{c.kindOther}</option>
              </Select>
            </Field>
          ) : null}

          {mode === "task" ? (
            <Field>
              <Label htmlFor="atc-due">{c.dueOptional}</Label>
              <Input id="atc-due" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </Field>
          ) : null}

          {mode === "paper" || mode === "order" ? (
            <div>
              <p className="label-sm">{c.preview}</p>
              <div className="prose-plain mt-1.5 max-h-56 overflow-auto rounded-md bg-elevated px-3 py-2.5 text-muted">
                {source.body.slice(0, 1600)}
                {source.body.length > 1600 ? "…" : ""}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </SlideOver>
    </>
  );
}
