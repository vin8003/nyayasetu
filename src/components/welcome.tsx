import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, ScanSearch } from "lucide-react";
import { EciCnrFetch } from "@/components/eci-cnr-fetch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { openNewMatter } from "@/lib/app-events";
import { fill, p } from "@/lib/practice/copy";
import { DRAFT_KEY } from "@/lib/research/draft";
import { emptyIntake, type OutputLang } from "@/lib/research/types";
import { cn } from "@/lib/utils";

export function firstName(name: string | null | undefined) {
  const clean = String(name ?? "").trim();
  if (!clean || clean.includes("@")) return "";
  return clean.split(/\s+/)[0];
}

/** Hands the facts to the research desk and asks it to start straight away. */
export function startResearchWith(facts: string, lang: OutputLang) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ intake: { ...emptyIntake(lang), facts }, lang, autostart: true }));
  } catch {
    /* private mode: the desk opens empty */
  }
}

/**
 * First run. An empty desk is not a dashboard of zeros: it is two ways in.
 * Bring in a live case by CNR (the file then fills itself), or put a legal
 * question to the research desk.
 */
export function Welcome({ lang, name }: { lang: OutputLang; name: string }) {
  const c = p(lang);
  const navigate = useNavigate();
  const [facts, setFacts] = useState("");
  const enough = facts.trim().length >= 40;
  const first = firstName(name);

  return (
    <div className="welcome">
      <h1 className="welcome-title">{first ? fill(c.welcomeTitle, { name: first }) : c.welcomeTitleNoName}</h1>
      <p className="welcome-lead">{c.welcomeLead}</p>

      <div className="welcome-paths">
        <section className="path is-primary" aria-labelledby="path-cnr">
          <span className="path-icon" aria-hidden>
            <ScanSearch className="size-[1.125rem]" />
          </span>
          <h2 id="path-cnr" className="path-title">
            {c.pathCnrTitle}
          </h2>
          <p className="path-text">{c.pathCnrText}</p>
          <div className="path-form">
            <EciCnrFetch
              lang={lang}
              size="lg"
              onLanded={(landed) => navigate({ to: "/matters/$id", params: { id: landed.matterId } })}
            />
          </div>
          <p className="path-foot">
            {c.pathCnrNoCnr}{" "}
            <button type="button" className="link-accent" onClick={() => openNewMatter({ mode: "manual" })}>
              {c.pathCnrByHand}
            </button>
          </p>
        </section>

        <section className="path" aria-labelledby="path-research">
          <span className="path-icon" aria-hidden>
            <BookOpen className="size-[1.125rem]" />
          </span>
          <h2 id="path-research" className="path-title">
            {c.pathResearchTitle}
          </h2>
          <p className="path-text">{c.pathResearchText}</p>
          <form
            className="path-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!enough) return;
              startResearchWith(facts.trim(), lang);
              navigate({ to: "/research", search: { matter: undefined, memo: undefined } });
            }}
          >
            <Label htmlFor="welcome-facts" className="sr-only">
              {c.pathResearchTitle}
            </Label>
            <textarea
              id="welcome-facts"
              className="control min-h-32 resize-y px-3 py-2.5 text-sm leading-relaxed"
              value={facts}
              placeholder={c.pathResearchPlaceholder}
              onChange={(e) => setFacts(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn("text-xs tabular-nums", enough ? "text-muted" : "text-subtle")} aria-live="polite">
                {enough ? "" : fill(c.pathResearchMin, { n: facts.trim().length })}
              </span>
              <Button type="submit" variant="outline" disabled={!enough}>
                {c.pathResearchAction}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </form>
          <p className="path-foot">
            <Link to="/ask" search={{ matter: undefined, chat: undefined, memo: undefined }} className="link-accent">
              {c.pathAsk}
            </Link>
          </p>
        </section>
      </div>

      <p className="fineprint mt-8 max-w-2xl">{c.trustNote}</p>
    </div>
  );
}

type Totals = { matters: number; memos: number; confirmedOrders: number };

/** Three first steps, shown on Today until they are done or hidden. */
export function SetupChecklist({ lang, userId, totals }: { lang: OutputLang; userId: string; totals: Totals }) {
  const c = p(lang);
  const key = `cb.setup.hidden.${userId}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      setHidden(false);
    }
  }, [key]);

  const steps = [
    { done: totals.matters > 0, title: c.setupCase, hint: c.setupCaseHint, onClick: () => openNewMatter({ mode: "cnr" }) },
    { done: totals.memos > 0, title: c.setupResearch, hint: c.setupResearchHint, to: "/research" as const },
    { done: totals.confirmedOrders > 0, title: c.setupOrder, hint: c.setupOrderHint, to: "/inbox" as const },
  ];
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;

  return (
    <section className="setup mb-8" aria-labelledby="setup-title">
      <div className="setup-head">
        <div>
          <h2 id="setup-title" className="section-title">
            {c.setupTitle}
          </h2>
          <p className="text-xs text-muted tabular-nums">{fill(c.setupProgress, { done })}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHidden(true);
            try {
              localStorage.setItem(key, "1");
            } catch {
              /* stays hidden for this visit */
            }
          }}
        >
          {c.setupHide}
        </Button>
      </div>
      <div className="setup-meter meter" aria-hidden>
        <span style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <div className="setup-steps">
        {steps.map((step) => {
          const body = (
            <>
              <span className="tick" aria-hidden>
                {step.done ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span>
                <span className="setup-step-title block">{step.title}</span>
                <span className="setup-step-hint block">{step.hint}</span>
              </span>
            </>
          );
          if (step.done) {
            return (
              <div key={step.title} className="setup-step is-done">
                {body}
              </div>
            );
          }
          return step.to ? (
            <Link key={step.title} to={step.to} className="setup-step">
              {body}
            </Link>
          ) : (
            <button key={step.title} type="button" className="setup-step" onClick={step.onClick}>
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
}
