import { t } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";
import { CiteMark } from "@/components/cite-mark";
import { Button } from "@/components/ui/button";

export function ResearchStage({
  lang,
  elapsed,
  onCancel,
  mode = "research",
}: {
  lang: OutputLang;
  elapsed: number;
  onCancel: () => void;
  mode?: "research" | "letter" | "followup";
}) {
  const c = t(lang);
  const title = mode === "letter" ? c.draftingLetter : mode === "followup" ? c.followUpRunning : c.researching;
  const note = mode === "letter" ? c.letterWaitNote : c.waitNote;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <CiteMark className="size-12" />
      <p className="mt-6 font-display text-2xl tracking-tight shimmer-text">{title}</p>
      <p className="mt-2 text-sm text-muted tabular-nums">{elapsed}s</p>
      <p className="mt-1 text-xs text-subtle">{note}</p>
      <Button variant="outline" className="mt-8" onClick={onCancel}>
        {c.cancel}
      </Button>
    </div>
  );
}
