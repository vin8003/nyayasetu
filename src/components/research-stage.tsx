import { t, type Copy } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";
import { SetuMark } from "@/components/setu-mark";

export function ResearchStage({ lang, elapsed }: { lang: OutputLang; elapsed: number }) {
  const c = t(lang);
  const stages: { label: keyof Pick<Copy, "stageIssue" | "stageSearch" | "stageRatio" | "stageDraft">; after: number }[] =
    [
      { label: "stageIssue", after: 0 },
      { label: "stageSearch", after: 6 },
      { label: "stageRatio", after: 18 },
      { label: "stageDraft", after: 32 },
    ];

  const active = stages.reduce((acc, s, i) => (elapsed >= s.after ? i : acc), 0);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <SetuMark className="size-12" />
      <p className="mt-6 font-display text-2xl tracking-tight shimmer-text">{c.researching}</p>
      <p className="mt-2 text-sm text-muted tabular-nums">{elapsed}s</p>
      <p className="mt-1 text-xs text-subtle">{c.waitNote}</p>
      <ol className="mt-10 w-full space-y-3 text-left">
        {stages.map((s, i) => {
          const state = i < active ? "done" : i === active ? "now" : "wait";
          return (
            <li
              key={s.label}
              className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgb(255_255_255/0.06)]"
            >
              <span
                className={
                  state === "now"
                    ? "size-2 shrink-0 rounded-full bg-accent animate-[pulse-dot_1.2s_ease-in-out_infinite]"
                    : state === "done"
                      ? "size-2 shrink-0 rounded-full bg-ok"
                      : "size-2 shrink-0 rounded-full bg-border"
                }
              />
              <span className={state === "wait" ? "text-sm text-subtle" : "text-sm text-fg"}>
                {c[s.label]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
