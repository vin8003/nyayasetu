import { t } from "./copy.ts";
import { citablePrecedentsFromMemo, filterLetterGrounds } from "./letter-cites.ts";
import { asLetterGrounds, type ParsedLetterDraft } from "./letter-parse.ts";
import type { LegalLetter, LegalMemo, LetterKind, OutputLang } from "./types.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function compact(lines: string[]): string {
  return lines.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n").trim();
}

export function assembleLetter(opts: {
  kind: LetterKind;
  lang: OutputLang;
  draft: ParsedLetterDraft;
  memo: LegalMemo;
}): LegalLetter {
  const citable = citablePrecedentsFromMemo(opts.memo);
  const grounds = filterLetterGrounds(asLetterGrounds(opts.draft.grounds), citable);
  return {
    kind: opts.kind,
    lang: opts.lang,
    heading: opts.draft.heading.trim(),
    parties: opts.draft.parties.trim(),
    facts: opts.draft.facts.trim(),
    grounds,
    closing: opts.draft.closing.trim(),
    timeOrStand: opts.draft.timeOrStand.trim(),
    risks: opts.draft.risks.trim(),
  };
}

export function formatLegalLetter(letter: LegalLetter): string {
  const c = t(letter.lang);
  const kicker = letter.kind === "notice" ? c.letterNoticeKicker : c.letterReplyKicker;
  const groundsHeading = letter.kind === "reply" ? c.letterParaReply : c.letterGrounds;
  const closingHeading = letter.kind === "notice" ? c.letterDemand : "";
  const standHeading = letter.kind === "notice" ? c.letterTime : c.letterStand;
  const groundLines = letter.grounds.flatMap((ground, i) => {
    const block = [
      `${i + 1}. ${ground.heading}`.trim(),
      ground.text,
      `${c.letterCitation}: ${ground.citation}`,
      `${c.letterUrl}: ${ground.url}`,
    ].filter(Boolean);
    return i === letter.grounds.length - 1 ? block : [...block, ""];
  });

  return compact([
    `NyayaSetu · ${kicker}`,
    letter.heading,
    letter.kind === "reply" ? c.withoutPrejudice : "",
    "",
    c.letterParties,
    letter.parties,
    "",
    c.letterFacts,
    letter.facts,
    "",
    groundsHeading,
    ...groundLines,
    "",
    closingHeading,
    letter.closing,
    "",
    standHeading,
    letter.timeOrStand,
    "",
    c.risks,
    letter.risks,
    "",
    c.disclaimer,
  ]);
}

export function formatLegalLetterHtml(letter: LegalLetter): string {
  const body = escapeHtml(formatLegalLetter(letter)).replaceAll("\n", "<br>\n");
  const title = escapeHtml(letter.heading || "NyayaSetu letter");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
<p>${body}</p>
</body>
</html>`;
}
