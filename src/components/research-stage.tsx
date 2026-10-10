import { t } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";
import { CiteMark } from "@/components/cite-mark";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "research" | "letter" | "followup";

/** Where in the run we are, judged by elapsed time. The real work is one server call, so this is an honest estimate, not a status feed. */
const STEPS: Record<Mode, { at: number; en: string; hi: string }[]> = {
  research: [
    { at: 0, en: "Searching Supreme Court, High Court and Indian Kanoon", hi: "सुप्रीम कोर्ट, हाईकोर्ट और इंडियन कानून में खोज" },
    { at: 18, en: "Reading the matching rulings", hi: "मिलते-जुलते फ़ैसले पढ़े जा रहे हैं" },
    { at: 42, en: "Writing the memo and checking citations", hi: "मेमो लिखा जा रहा है, उद्धरण जाँचे जा रहे हैं" },
  ],
  followup: [
    { at: 0, en: "Re-reading your memo", hi: "आपका मेमो फिर से पढ़ा जा रहा है" },
    { at: 12, en: "Searching for the new point", hi: "नए मुद्दे की खोज" },
    { at: 30, en: "Writing the follow-up", hi: "फॉलो-अप लिखा जा रहा है" },
  ],
  letter: [
    { at: 0, en: "Pulling facts and grounds from the memo", hi: "मेमो से तथ्य और आधार लिए जा रहे हैं" },
    { at: 10, en: "Drafting the document", hi: "दस्तावेज़ का ड्राफ्ट" },
    { at: 28, en: "Checking citations", hi: "उद्धरण जाँचे जा रहे हैं" },
  ],
};

export function ResearchStage({
  lang,
  elapsed,
  onCancel,
  mode = "research",
}: {
  lang: OutputLang;
  elapsed: number;
  onCancel: () => void;
  mode?: Mode;
}) {
  const c = t(lang);
  const title = mode === "letter" ? c.draftingLetter : mode === "followup" ? c.followUpRunning : c.researching;
  const note = mode === "letter" ? c.letterWaitNote : c.waitNote;
  const steps = STEPS[mode];
  const current = steps.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), 0);
  const pct = Math.min(95, Math.round((elapsed / 70) * 100));

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center" role="status" aria-live="polite">
      <CiteMark className="size-12" />
      <p className="mt-6 section-title tracking-tight shimmer-text">{title}</p>
      <p className="mt-2 text-sm text-muted tabular-nums">{elapsed}s</p>

      <div className="meter mt-5 w-full" aria-hidden>
        <span style={{ width: `${Math.max(6, pct)}%` }} />
      </div>

      <ol className="mt-6 w-full space-y-3 text-left">
        {steps.map((s, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <li key={s.en} className={cn("flex items-center gap-3 text-sm", on ? "text-fg" : "text-subtle")}>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-xs",
                  done ? "bg-ok/20 text-ok" : on ? "bg-accent/20 text-accent" : "bg-elevated text-subtle",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={on ? "font-medium" : ""}>{lang === "hi" ? s.hi : s.en}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs text-subtle">{note}</p>
      <Button variant="outline" className="mt-6" onClick={onCancel}>
        {c.cancel}
      </Button>
    </div>
  );
}
