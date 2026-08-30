import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";

export function GuestPanel({ lang }: { lang: OutputLang }) {
  const c = p(lang);
  return (
    <div className="stagger-in max-w-xl">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{c.kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{c.hero}</h1>
      <p className="mt-3 text-base text-muted sm:text-lg">{c.tagline}</p>
      <p className="mt-6 text-sm leading-relaxed text-muted">{c.signInNeed}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <a href="/login">{c.signIn}</a>
        </Button>
        <Button asChild variant="outline">
          <Link to="/research">{c.research}</Link>
        </Button>
      </div>
      <p className="mt-10 text-xs leading-relaxed text-subtle">{c.trustNote}</p>
    </div>
  );
}
