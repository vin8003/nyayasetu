import { ArrowLeft, Copy, Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { LegalLetter, OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { formatLegalLetter, formatLegalLetterHtml, letterKicker } from "@/lib/research/letter-format";
import { httpHref } from "@/lib/research/verify";
import { Button } from "@/components/ui/button";

export function LetterView({
  lang,
  letter,
  onBack,
}: {
  lang: OutputLang;
  letter: LegalLetter;
  onBack: () => void;
}) {
  const c = t(lang);
  const doc = t(letter.lang);
  const kicker = letterKicker(letter.kind, doc);

  async function copyLetter() {
    await navigator.clipboard.writeText(formatLegalLetter(letter));
    toast.success(c.copied);
  }

  function downloadWord() {
    const html = formatLegalLetterHtml(letter);
    const blob = new Blob([html], { type: "application/msword" });
    const href = URL.createObjectURL(blob);
    const slug = (letter.heading || "nyayasetu-letter")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slug || "nyayasetu-letter"}.doc`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {c.backToMemo}
          </button>
          <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
            {letter.heading || kicker}
          </h1>
          {letter.kind === "reply" ? <p className="mt-1 text-sm text-muted">{doc.withoutPrejudice}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void copyLetter()}>
            <Copy className="size-3.5" />
            {c.copyLetter}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            {c.print}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadWord}>
            <FileDown className="size-3.5" />
            {c.wordBrief}
          </Button>
        </div>
      </div>

      <article className="no-print print-paper rounded-xl bg-paper px-5 py-8 text-paper-ink shadow-[var(--shadow-paper)] sm:px-10 sm:py-12">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.18em] text-paper-muted">
          NyayaSetu · {kicker}
        </p>
        {letter.kind === "reply" ? (
          <p className="mb-6 text-sm italic text-paper-muted">{doc.withoutPrejudice}</p>
        ) : null}
        <section className="space-y-6 font-display text-[17px] leading-[1.65]">
          <div>
            <h2 className="font-medium">{doc.letterParties}</h2>
            <p className="mt-2 whitespace-pre-wrap">{letter.parties}</p>
          </div>
          <div>
            <h2 className="font-medium">{doc.letterFacts}</h2>
            <p className="mt-2 whitespace-pre-wrap">{letter.facts}</p>
          </div>
          <div>
            <h2 className="font-medium">{letter.kind === "reply" ? doc.letterParaReply : doc.letterGrounds}</h2>
            <ol className="mt-3 space-y-4">
              {letter.grounds.map((ground, i) => {
                const href = httpHref(ground.url);
                return (
                  <li key={`${ground.url}-${i}`}>
                    <p className="font-medium">
                      {i + 1}. {ground.heading}
                    </p>
                    {ground.text ? <p className="mt-1 whitespace-pre-wrap">{ground.text}</p> : null}
                    <p className="mt-2 font-mono text-xs text-paper-muted">
                      {doc.letterCitation}: {ground.citation}
                    </p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block font-mono text-xs text-accent hover:text-paper-ink"
                      >
                        {doc.letterUrl}: {href}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          {letter.closing ? (
            <div>
              {letter.kind === "notice" ? <h2 className="font-medium">{doc.letterDemand}</h2> : null}
              {letter.kind === "petition" ? <h2 className="font-medium">{doc.letterPrayer}</h2> : null}
              <p className={`whitespace-pre-wrap ${letter.kind === "notice" || letter.kind === "petition" ? "mt-2" : ""}`}>
                {letter.closing}
              </p>
            </div>
          ) : null}
          {letter.timeOrStand ? (
            <div>
              <h2 className="font-medium">
                {letter.kind === "notice"
                  ? doc.letterTime
                  : letter.kind === "petition"
                    ? doc.letterInterim
                    : doc.letterStand}
              </h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.timeOrStand}</p>
            </div>
          ) : null}
          {letter.kind === "petition" && letter.verification ? (
            <div>
              <h2 className="font-medium">{doc.letterVerification}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.verification}</p>
            </div>
          ) : null}
          {letter.risks ? (
            <div>
              <h2 className="font-medium">{doc.risks}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.risks}</p>
            </div>
          ) : null}
        </section>
      </article>

      <article className="print-only print-paper rounded-xl bg-paper px-5 py-8 text-paper-ink">
        <pre className="whitespace-pre-wrap font-display text-[17px] leading-[1.65]">{formatLegalLetter(letter)}</pre>
      </article>

      <p className="no-print text-xs leading-relaxed text-subtle">{doc.disclaimer}</p>
    </div>
  );
}
