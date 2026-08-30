import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CiteMark } from "@/components/cite-mark";
import { Button } from "@/components/ui/button";
import { storyCopy } from "@/lib/story/copy";
import type { OutputLang } from "@/lib/research/types";

const TITLE = "From a research desk to a chamber — CiteBench";
const DESCRIPTION =
  "Last night CiteBench was a paste-facts research desk. This morning it is a chamber: diary, matters, order inbox, and citation-gated Indian case-law. Under sixteen hours. Not legal advice.";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: "/og.jpg" },
    ],
  }),
  component: StoryPage,
});

export function StoryPage() {
  const [lang, setLang] = useState<OutputLang>("en");
  const c = storyCopy[lang];

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="no-print sticky top-0 z-20 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label={c.home}>
            <CiteMark className="size-7" />
            <span className="font-display text-lg tracking-tight">{c.home}</span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md bg-elevated p-0.5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              {(["hi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={
                    lang === code
                      ? "h-8 rounded-sm px-2.5 text-xs font-medium bg-accent text-accent-fg"
                      : "h-8 rounded-sm px-2.5 text-xs font-medium text-muted hover:text-fg"
                  }
                >
                  {code === "hi" ? "हि" : "EN"}
                </button>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm">
              <a href="/login">{c.signIn}</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-10 sm:py-16">
        <article className="print-paper mx-auto max-w-3xl rounded-xl bg-paper px-5 py-10 text-paper-ink shadow-paper sm:px-12 sm:py-14">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-accent">{c.kicker}</p>
          <h1 className="mt-4 font-display text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-5 max-w-[36rem] text-lg leading-relaxed text-paper-muted sm:text-xl">{c.dek}</p>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-paper-muted">
            <span className="font-medium text-paper-ink">{c.byline}</span>
            <span aria-hidden>·</span>
            <time dateTime="2026-08-30">{c.dateline}</time>
          </p>

          <div className="mt-10 space-y-5 text-[1.05rem] leading-[1.75] sm:text-[1.125rem]">
            <p className={lang === "en" ? "story-drop" : undefined}>{c.p1}</p>
            <p>{c.p2}</p>
            <p>{c.p3}</p>
            <p>{c.p4}</p>
          </div>

          <blockquote className="my-12 border-l-2 border-accent/70 pl-5 font-display text-2xl font-medium leading-snug italic tracking-tight sm:text-[1.65rem]">
            {c.pull}
          </blockquote>

          <h2 className="font-display text-2xl font-medium tracking-tight">{c.verifiedH}</h2>
          <div className="mt-4 space-y-4 text-[1.05rem] leading-[1.75] text-paper-ink sm:text-[1.125rem]">
            <p>{c.verified1}</p>
            <p>{c.verified2}</p>
            <p>{c.verified3}</p>
          </div>

          <h2 className="mt-14 font-display text-2xl font-medium tracking-tight">{c.hoursH}</h2>
          <p className="mt-2 text-sm text-paper-muted">{c.hoursLead}</p>
          <ol className="mt-6 divide-y divide-paper-line border-y border-paper-line">
            {c.beats.map((beat) => (
              <li key={beat.time} className="grid grid-cols-[4.5rem_1fr] gap-4 py-4 sm:grid-cols-[5.5rem_1fr]">
                <span className="font-mono text-xs tabular-nums text-accent sm:text-sm">{beat.time}</span>
                <div>
                  <div className="font-medium">{beat.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-paper-muted">{beat.note}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-14 font-display text-2xl font-medium tracking-tight">{c.thenNowH}</h2>
          <div className="mt-6 overflow-hidden rounded-lg border border-paper-line">
            <div className="grid grid-cols-2 bg-paper-line/50 text-[11px] font-medium uppercase tracking-[0.16em] text-paper-muted">
              <div className="px-4 py-2.5">{c.then}</div>
              <div className="px-4 py-2.5">{c.now}</div>
            </div>
            {c.pairs.map((row) => (
              <div
                key={row.night}
                className="grid grid-cols-2 divide-x divide-paper-line border-t border-paper-line text-sm leading-relaxed"
              >
                <p className="px-4 py-3.5 text-paper-muted">{row.night}</p>
                <p className="px-4 py-3.5">{row.morning}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[1.05rem] leading-[1.75] sm:text-[1.125rem]">{c.sample}</p>

          <h2 className="mt-14 font-display text-2xl font-medium tracking-tight">{c.notH}</h2>
          <ul className="mt-4 space-y-2.5 text-[1.05rem] leading-relaxed">
            {c.notItems.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-paper-muted" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-paper-muted">{c.notNote}</p>

          <h2 className="mt-14 font-display text-2xl font-medium tracking-tight">{c.closeH}</h2>
          <div className="mt-4 space-y-4 text-[1.05rem] leading-[1.75] sm:text-[1.125rem]">
            <p>{c.close1}</p>
            <p>{c.close2}</p>
            <p>{c.close3}</p>
          </div>

          <p className="mt-12 font-display text-lg italic text-paper-muted">{c.sign}</p>
          <p className="mt-8 border-t border-paper-line pt-6 text-xs leading-relaxed text-paper-muted">{c.disclaimer}</p>
        </article>

        <div className="no-print mx-auto mt-8 flex max-w-3xl flex-wrap gap-3">
          <Button asChild>
            <a href="/login">{c.openChamber}</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">{c.home}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
