import { Check, ChevronLeft, Copy, FileDown, FolderOpen, Printer } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import type { LegalLetter, OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";
import { formatLegalLetter, formatLegalLetterHtml, letterChrome } from "@/lib/research/letter-format";
import { httpHref } from "@/lib/research/verify";
import { AddToCase } from "@/components/add-to-case";
import { Button } from "@/components/ui/button";

const PAPER_KIND: Record<LegalLetter["kind"], string> = {
  notice: "notice",
  reply: "notice",
  petition: "pleading",
  writtenStatement: "pleading",
};

export function LetterView({
  lang,
  letter,
  onBack,
  onFile = false,
  matter,
  onFiled,
}: {
  lang: OutputLang;
  letter: LegalLetter;
  onBack: () => void;
  onFile?: boolean;
  matter?: { id: string; title: string } | null;
  onFiled?: (matterId: string) => void;
}) {
  const c = t(lang);
  const doc = t(letter.lang);
  const chrome = letterChrome(letter.kind, doc);
  const kicker = chrome.kicker;
  const heading = letter.heading || kicker;

  async function copyLetter() {
    await navigator.clipboard.writeText(formatLegalLetter(letter));
    toast.success(c.copied);
  }

  function downloadWord() {
    const html = formatLegalLetterHtml(letter);
    const blob = new Blob([html], { type: "application/msword" });
    const href = URL.createObjectURL(blob);
    const slug = (letter.heading || "citebench-letter")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${slug || "citebench-letter"}.doc`;
    a.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="no-print">
        <button type="button" onClick={onBack} className="back-link">
          <ChevronLeft className="size-4" aria-hidden />
          {c.backToMemo}
        </button>
        <h1 className="page-title max-w-3xl">{heading}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="capitalize">{kicker}</span>
          {chrome.withoutPrejudice ? <span>{doc.withoutPrejudice}</span> : null}
          {onFile && matter ? (
            <Link to="/matters/$id" params={{ id: matter.id }} search={{ tab: "papers" }} className="inline-flex items-center gap-1 font-medium text-fg hover:underline">
              <Check className="size-3.5 text-ok" aria-hidden />
              {c.onFile}: {matter.title}
            </Link>
          ) : null}
        </div>
        <div className="toolbar mt-5">
          {!onFile ? (
            <AddToCase
              lang={lang}
              variant="primary"
              matterId={matter?.id ?? null}
              onFiled={onFiled}
              source={{ title: heading, body: formatLegalLetter(letter), aiDraft: true, kind: PAPER_KIND[letter.kind] }}
            />
          ) : matter ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/matters/$id" params={{ id: matter.id }} search={{ tab: "papers" }}>
                <FolderOpen className="size-4" aria-hidden />
                {c.openFile}
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void copyLetter()}>
            <Copy className="size-3.5" aria-hidden />
            {c.copyLetter}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadWord}>
            <FileDown className="size-3.5" aria-hidden />
            {c.wordBrief}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" aria-hidden />
            {c.print}
          </Button>
        </div>
      </header>

      <article className="no-print print-paper paper doc-sheet">
        <p className="doc-head">CiteBench · {kicker}</p>
        {chrome.withoutPrejudice ? <p className="doc mb-6 italic text-paper-muted">{doc.withoutPrejudice}</p> : null}
        <section className="doc flex flex-col gap-6">
          <div>
            <h2>{doc.letterParties}</h2>
            <p className="mt-2 whitespace-pre-wrap">{letter.parties}</p>
          </div>
          <div>
            <h2>{doc.letterFacts}</h2>
            <p className="mt-2 whitespace-pre-wrap">{letter.facts}</p>
          </div>
          {chrome.followOnFirst && letter.timeOrStand ? (
            <div>
              <h2>{chrome.followOnHeading}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.timeOrStand}</p>
            </div>
          ) : null}
          <div>
            <h2>{chrome.groundsHeading}</h2>
            <ol className="mt-3 flex flex-col gap-5">
              {letter.grounds.map((ground, i) => {
                const href = httpHref(ground.url);
                return (
                  <li key={`${ground.url}-${i}`}>
                    <p className="font-semibold">
                      {i + 1}. {ground.heading}
                    </p>
                    {ground.text ? <p className="mt-1 whitespace-pre-wrap">{ground.text}</p> : null}
                    <p className="mono mt-2 text-paper-muted">
                      {doc.letterCitation}: {ground.citation}
                    </p>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="mono mt-1 inline-block break-all text-accent hover:underline">
                        {href}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
          {letter.closing ? (
            <div>
              {chrome.closingHeading ? <h2>{chrome.closingHeading}</h2> : null}
              <p className={`whitespace-pre-wrap ${chrome.closingHeading ? "mt-2" : ""}`}>{letter.closing}</p>
            </div>
          ) : null}
          {!chrome.followOnFirst && letter.timeOrStand ? (
            <div>
              <h2>{chrome.followOnHeading}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.timeOrStand}</p>
            </div>
          ) : null}
          {letter.verification && chrome.verificationHeading ? (
            <div>
              <h2>{chrome.verificationHeading}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.verification}</p>
            </div>
          ) : null}
          {letter.risks ? (
            <div>
              <h2>{doc.risks}</h2>
              <p className="mt-2 whitespace-pre-wrap">{letter.risks}</p>
            </div>
          ) : null}
        </section>
      </article>

      <article className="print-only print-paper">
        <pre className="whitespace-pre-wrap font-serif text-[15px] leading-[1.6]">{formatLegalLetter(letter)}</pre>
      </article>

      <p className="no-print fineprint max-w-2xl">{doc.disclaimer}</p>
    </div>
  );
}
