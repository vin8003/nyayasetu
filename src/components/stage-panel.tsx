import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { p } from "@/lib/practice/copy";
import type { ProceedingId } from "@/lib/practice/types";
import type { OutputLang } from "@/lib/research/types";
import { possibleNext, stageDef } from "@/lib/practice/workflow";
import { cn } from "@/lib/utils";

/** What this stage means, who does what, and where it can go next. */
export function StagePanel({ lang, proceeding, stage }: { lang: OutputLang; proceeding: ProceedingId | string; stage: string }) {
  const c = p(lang);
  const [more, setMore] = useState(false);
  const def = stageDef(proceeding, stage);
  if (!def) return null;
  const docs: string[] = def.docs ?? [];
  const deadlines: string[] = def.deadlines ?? [];
  const ai: string[] = def.ai ?? [];
  const human: string[] = def.human ?? [];
  const next = possibleNext(proceeding, stage);
  const label = lang === "hi" ? def.labelHi : def.label;

  return (
    <section className="card card-pad" aria-labelledby="stage-guide">
      <p className="label-sm">{c.stageGuide}</p>
      <h2 id="stage-guide" className="mt-0.5 text-base font-semibold tracking-tight">
        {label}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{def.what}</p>

      <dl className="guide mt-4">
        <dt>{c.lawyerDoes}</dt>
        <dd>{def.lawyer}</dd>
        {next.length > 0 ? (
          <>
            <dt>{c.possibleNext}</dt>
            <dd>
              <ul className="flex flex-col gap-1">
                {next.map((n) => (
                  <li key={`${n.kind}-${n.id}-${"when" in n ? n.when : ""}`} className="flex flex-wrap items-baseline gap-x-2">
                    <span>{n.label}</span>
                    {"when" in n && n.when ? <span className="text-[0.8125rem] text-muted">{n.when}</span> : null}
                    {n.kind === "branch" ? <Badge tone="warn">{lang === "hi" ? "शाखा" : "Branch"}</Badge> : null}
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>

      {more ? (
        <dl className="guide mt-4 border-t border-border pt-4">
          <dt>{c.courtDoes}</dt>
          <dd className="text-muted">{def.court}</dd>
          {docs.length > 0 ? (
            <>
              <dt>{c.typicalDocs}</dt>
              <dd>
                <span className="tag-list mt-1">
                  {docs.map((d) => (
                    <Badge key={d}>{d}</Badge>
                  ))}
                </span>
              </dd>
            </>
          ) : null}
          {deadlines.length > 0 ? (
            <>
              <dt>{c.typicalDeadlines}</dt>
              <dd>
                <ul className="flex flex-col gap-1 text-muted">
                  {deadlines.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
          <dt>{c.aiCan}</dt>
          <dd className="text-muted">{ai.join(" · ")}</dd>
          <dt>{c.humanGate}</dt>
          <dd className="text-muted">{human.join(" · ")}</dd>
        </dl>
      ) : null}

      <button type="button" className="link-quiet mt-4 inline-flex items-center gap-1 text-[0.8125rem]" aria-expanded={more} onClick={() => setMore((v) => !v)}>
        {more ? (lang === "hi" ? "कम दिखाएँ" : "Show less") : lang === "hi" ? "पूरी जानकारी" : "Court, documents and deadlines"}
        <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} aria-hidden />
      </button>
    </section>
  );
}
