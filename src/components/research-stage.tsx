import { Check } from "lucide-react";
import { t } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "research" | "letter" | "followup";

/** Where in the run we are, judged by elapsed time. The real work is one server call, so this is an honest estimate, not a status feed. */
const STEPS: Record<Mode, { at: number; en: string; hi: string }[]> = {
  research: [
    { at: 0, en: "Searching the Supreme Court, High Courts and Indian Kanoon", hi: "सुप्रीम कोर्ट, हाईकोर्ट और इंडियन कानून में खोज" },
    { at: 18, en: "Reading the matching rulings", hi: "मिलते-जुलते फ़ैसले पढ़े जा रहे हैं" },
    { at: 42, en: "Writing the memo and checking each citation", hi: "मेमो लिखा जा रहा है, हर उद्धरण जाँचा जा रहा है" },
  ],
  followup: [
    { at: 0, en: "Re-reading your memo", hi: "आपका मेमो फिर से पढ़ा जा रहा है" },
    { at: 12, en: "Searching for the new point", hi: "नए मुद्दे की खोज" },
    { at: 30, en: "Writing the follow-up", hi: "फॉलो-अप लिखा जा रहा है" },
  ],
  letter: [
    { at: 0, en: "Taking facts and grounds from the memo", hi: "मेमो से तथ्य और आधार लिए जा रहे हैं" },
    { at: 10, en: "Drafting the document", hi: "दस्तावेज़ का ड्राफ्ट" },
    { at: 28, en: "Keeping only verified citations", hi: "केवल जाँचे हुए उद्धरण रखे जा रहे हैं" },
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

  return (
    <div className="mx-auto flex max-w-md flex-col py-12" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="page-title">{title}</h1>
        <span className="text-sm tabular-nums text-muted">{elapsed}s</span>
      </div>
      <p className="mt-1 text-sm text-muted">{note}</p>

      <ol className="progress-steps mt-8">
        {steps.map((s, i) => {
          const done = i < current;
          const on = i === current;
          return (
            <li key={s.en} className={cn(on && "is-on", done && "is-done")}>
              <span className="progress-dot" aria-hidden>
                {done ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span>{lang === "hi" ? s.hi : s.en}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-10">
        <Button variant="outline" onClick={onCancel}>
          {c.cancel}
        </Button>
      </div>
    </div>
  );
}
