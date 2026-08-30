import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CiteMark } from "@/components/cite-mark";
import { storyCopy } from "@/lib/story/copy";
import type { OutputLang } from "@/lib/research/types";

const SITE = "https://citebench.ordereasy.win";

function storyUrl(lang: OutputLang) {
  return lang === "hi" ? `${SITE}/story?lang=hi` : `${SITE}/story`;
}

function storyHead(lang: OutputLang) {
  const c = storyCopy[lang];
  const url = storyUrl(lang);
  const title = `${c.title} — CiteBench`;
  return {
    meta: [
      { title },
      { name: "description", content: c.dek },
      { name: "theme-color", content: "#f4efe6" },
      { name: "author", content: "CiteBench" },
      { property: "og:site_name", content: "CiteBench" },
      { property: "og:title", content: title },
      { property: "og:description", content: c.dek },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:image", content: `${SITE}/og.jpg` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: lang === "hi" ? "hi_IN" : "en_IN" },
      { property: "article:published_time", content: "2026-08-30" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: c.dek },
      { name: "twitter:image", content: `${SITE}/og.jpg` },
    ],
    links: [
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: "en-IN", href: storyUrl("en") },
      { rel: "alternate", hrefLang: "hi-IN", href: storyUrl("hi") },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400;500;600;700&display=swap",
      },
    ],
  };
}

export const Route = createFileRoute("/story")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: search.lang === "hi" ? ("hi" as const) : undefined,
  }),
  head: ({ match }) => storyHead(match.search.lang === "hi" ? "hi" : "en"),
  component: StoryPage,
});

function StoryPage() {
  const { lang: langParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const lang: OutputLang = langParam === "hi" ? "hi" : "en";
  const c = storyCopy[lang];
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.lang;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = document.body.style.background;
    html.lang = lang === "hi" ? "hi-IN" : "en-IN";
    html.style.background = "#f4efe6";
    document.body.style.background = "#f4efe6";
    return () => {
      html.lang = prevLang;
      html.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
  }, [lang]);

  function setLang(next: OutputLang) {
    void navigate({
      to: "/story",
      search: { lang: next === "hi" ? "hi" : undefined },
      replace: true,
    });
  }

  async function copyLink() {
    const url = typeof window === "undefined" ? storyUrl(lang) : window.location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard can fail in insecure contexts */
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.dek,
    datePublished: "2026-08-30",
    dateModified: "2026-08-30",
    inLanguage: lang === "hi" ? "hi-IN" : "en-IN",
    url: storyUrl(lang),
    image: `${SITE}/og.jpg`,
    author: { "@type": "Organization", name: "CiteBench", url: SITE },
    publisher: { "@type": "Organization", name: "CiteBench", url: SITE },
  };

  return (
    <div className="story-page" lang={lang === "hi" ? "hi" : "en"}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="story-mast no-print">
        <div className="story-mast-inner">
          <Link to="/" className="story-brand" aria-label={c.home}>
            <CiteMark className="size-7 text-[inherit]" />
            <span>{c.home}</span>
          </Link>
          <div className="story-mast-actions">
            <div className="story-lang" role="group" aria-label={c.langLabel}>
              {(["hi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={lang === code ? "is-on" : undefined}
                  aria-pressed={lang === code}
                >
                  {code === "hi" ? "हि" : "EN"}
                </button>
              ))}
            </div>
            <a href="/login" className="story-text-link">
              {c.signIn}
            </a>
          </div>
        </div>
      </header>

      <article className="story-sheet print-paper">
        <header className="story-head">
          <p className="story-kicker">{c.kicker}</p>
          <h1 className="story-title">{c.title}</h1>
          <p className="story-dek">{c.dek}</p>
          <p className="story-byline">
            <span>{c.byline}</span>
            <span aria-hidden>·</span>
            <time dateTime="2026-08-30">{c.dateline}</time>
            <span aria-hidden>·</span>
            <span>{c.read}</span>
          </p>
          <div className="story-toolbar no-print">
            <span className="story-volume">{c.volume}</span>
            <button type="button" className="story-text-link" onClick={() => void copyLink()}>
              {copied ? c.shared : c.share}
            </button>
          </div>
        </header>

        <div className="story-body">
          <p className="story-drop">{c.p1}</p>
          <p>{c.p2}</p>
          <p>{c.p3}</p>
          <p>{c.p4}</p>
        </div>

        <blockquote className="story-pull">
          <p>{c.pull}</p>
        </blockquote>

        <section className="story-section" id="verified" aria-labelledby="verified-h">
          <h2 id="verified-h">{c.verifiedH}</h2>
          <div className="story-body">
            <p>{c.verified1}</p>
            <p>{c.verified2}</p>
            <p>{c.verified3}</p>
          </div>
        </section>

        <section className="story-section" id="hours" aria-labelledby="hours-h">
          <h2 id="hours-h">{c.hoursH}</h2>
          <p className="story-lead">{c.hoursLead}</p>
          <ol className="story-beats">
            {c.beats.map((beat) => (
              <li key={beat.time}>
                <time dateTime={`2026-08-${beat.day}T${beat.time}:00Z`}>
                  {beat.time}
                </time>
                <div>
                  <div className="story-beat-title">{beat.title}</div>
                  <p>{beat.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="story-section" id="then-now" aria-labelledby="then-now-h">
          <h2 id="then-now-h">{c.thenNowH}</h2>
          <dl className="story-compare">
            {c.pairs.map((row) => (
              <div key={row.night} className="story-pair">
                <div>
                  <dt>{c.then}</dt>
                  <dd>{row.night}</dd>
                </div>
                <div>
                  <dt>{c.now}</dt>
                  <dd>{row.morning}</dd>
                </div>
              </div>
            ))}
          </dl>
          <p className="story-body story-sample">{c.sample}</p>
        </section>

        <section className="story-section" id="not-shipped" aria-labelledby="not-h">
          <h2 id="not-h">{c.notH}</h2>
          <ul className="story-not">
            {c.notItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="story-lead">{c.notNote}</p>
        </section>

        <section className="story-section" aria-labelledby="close-h">
          <h2 id="close-h">{c.closeH}</h2>
          <div className="story-body">
            <p>{c.close1}</p>
            <p>{c.close2}</p>
            <p>{c.close3}</p>
          </div>
        </section>

        <footer className="story-end">
          <p className="story-sign">{c.sign}</p>
          <p className="story-disclaimer">{c.disclaimer}</p>
        </footer>
      </article>

      <div className="story-after no-print">
        <a href="/login" className="story-cta">
          {c.openChamber}
        </a>
        <Link to="/" className="story-text-link">
          {c.home}
        </Link>
      </div>
    </div>
  );
}
