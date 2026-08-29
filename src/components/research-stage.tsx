import { t } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";
import { SetuMark } from "@/components/setu-mark";
import { Button } from "@/components/ui/button";

export function ResearchStage({
  lang,
  elapsed,
  onCancel,
}: {
  lang: OutputLang;
  elapsed: number;
  onCancel: () => void;
}) {
  const c = t(lang);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <SetuMark className="size-12" />
      <p className="mt-6 font-display text-2xl tracking-tight shimmer-text">{c.researching}</p>
      <p className="mt-2 text-sm text-muted tabular-nums">{elapsed}s</p>
      <p className="mt-1 text-xs text-subtle">{c.waitNote}</p>
      <Button variant="outline" className="mt-8" onClick={onCancel}>
        {c.cancel}
      </Button>
    </div>
  );
}
