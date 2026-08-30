import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { p } from "@/lib/practice/copy";
import { storyCopy } from "@/lib/story/copy";
import type { OutputLang } from "@/lib/research/types";

export function GuestPanel({ lang }: { lang: OutputLang }) {
  const c = p(lang);
  const story = storyCopy[lang];
  return (
    <div className="stagger-in mx-auto max-w-2xl py-6 sm:py-12">
      <p className="eyebrow">{c.kicker}</p>
      <h1 className="page-title">{c.hero}</h1>
      <p className="page-lead text-lg">{c.tagline}</p>
      <p className="section-note max-w-lg">{c.signInNeed}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href="/login">{c.signIn}</a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/research" search={{ matter: undefined }}>
            {c.research}
          </Link>
        </Button>
      </div>

      <Link
        to="/story"
        search={{ lang: lang === "hi" ? "hi" : undefined }}
        className="paper paper-link group mt-12 px-6 py-6"
      >
        <p className="story-kicker">{story.kicker}</p>
        <h2 className="mt-2 section-title font-medium tracking-tight">{story.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-paper-muted">{story.dek}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
          {c.readStory}
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>

      <p className="fineprint mt-12">{c.trustNote}</p>
    </div>
  );
}
