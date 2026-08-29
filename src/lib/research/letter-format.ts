import { t, type Copy } from "./copy.ts";
import { citablePrecedentsFromMemo, filterLetterGrounds, scrubUnverifiedText, unverifiedCiteLabels } from "./letter-cites.ts";
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

export function letterKicker(kind: LetterKind, c: Copy): string {
  if (kind === "notice") return c.letterNoticeKicker;
  if (kind === "reply") return c.letterReplyKicker;
  return c.letterPetitionKicker;
}

function closingHeading(kind: LetterKind, c: Copy, has: boolean): string {
  if (!has) return "";
  if (kind === "notice") return c.letterDemand;
  if (kind === "petition") return c.letterPrayer;
  return "";
}

function followOnHeading(kind: LetterKind, c: Copy, has: boolean): string {
  if (!has) return "";
  if (kind === "notice") return c.letterTime;
  if (kind === "petition") return c.letterInterim;
  return c.letterStand;
}

export function assembleLetter(opts: {
  kind: LetterKind;
  lang: OutputLang;
  draft: ParsedLetterDraft;
  memo: LegalMemo;
}): LegalLetter {
  const citable = citablePrecedentsFromMemo(opts.memo);
  const banned = unverifiedCiteLabels(opts.memo);
  const scrub = (value: string) => scrubUnverifiedText(value, banned);
  const grounds = filterLetterGrounds(asLetterGrounds(opts.draft.grounds), citable).map((ground) => ({
    ...ground,
    heading: scrub(ground.heading),
    text: scrub(ground.text),
  }));
  return {
    kind: opts.kind,
    lang: opts.lang,
    heading: scrub(opts.draft.heading),
    parties: scrub(opts.draft.parties),
    facts: scrub(opts.draft.facts),
    grounds,
    closing: scrub(opts.draft.closing),
    timeOrStand: scrub(opts.draft.timeOrStand),
    verification: opts.kind === "petition" ? scrub(opts.draft.verification ?? "") : "",
    risks: scrub(opts.draft.risks),
  };
}

export function formatLegalLetter(letter: LegalLetter): string {
  const c = t(letter.lang);
  const kicker = letterKicker(letter.kind, c);
  const groundsHeading = letter.kind === "reply" ? c.letterParaReply : c.letterGrounds;
  const groundLines = letter.grounds.flatMap((ground, i) => {
    const block = [`${i + 1}. ${ground.heading}`.trim(), ground.text];
    if (ground.citation) block.push(`${c.letterCitation}: ${ground.citation}`);
    if (ground.url) block.push(`${c.letterUrl}: ${ground.url}`);
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
    closingHeading(letter.kind, c, Boolean(letter.closing)),
    letter.closing,
    "",
    followOnHeading(letter.kind, c, Boolean(letter.timeOrStand)),
    letter.timeOrStand,
    "",
    letter.kind === "petition" && letter.verification ? c.letterVerification : "",
    letter.kind === "petition" ? letter.verification : "",
    "",
    letter.risks ? c.risks : "",
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
