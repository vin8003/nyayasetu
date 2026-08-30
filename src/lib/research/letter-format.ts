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

export type LetterChrome = {
  kicker: string;
  withoutPrejudice: boolean;
  groundsHeading: string;
  closingHeading: string;
  followOnHeading: string;
  verificationHeading: string;
  followOnFirst: boolean;
};

export function letterChrome(kind: LetterKind, c: Copy): LetterChrome {
  const byKind: Record<LetterKind, LetterChrome> = {
    notice: {
      kicker: c.letterNoticeKicker,
      withoutPrejudice: false,
      groundsHeading: c.letterGrounds,
      closingHeading: c.letterDemand,
      followOnHeading: c.letterTime,
      verificationHeading: "",
      followOnFirst: false,
    },
    reply: {
      kicker: c.letterReplyKicker,
      withoutPrejudice: true,
      groundsHeading: c.letterParaReply,
      closingHeading: "",
      followOnHeading: c.letterStand,
      verificationHeading: "",
      followOnFirst: false,
    },
    petition: {
      kicker: c.letterPetitionKicker,
      withoutPrejudice: false,
      groundsHeading: c.letterGrounds,
      closingHeading: c.letterPrayer,
      followOnHeading: c.letterInterim,
      verificationHeading: c.letterVerification,
      followOnFirst: false,
    },
    writtenStatement: {
      kicker: c.letterWsKicker,
      withoutPrejudice: false,
      groundsHeading: c.letterParaReply,
      closingHeading: c.letterPrayer,
      followOnHeading: c.letterPrelim,
      verificationHeading: c.letterVerification,
      followOnFirst: true,
    },
  };
  return byKind[kind];
}

export function letterKicker(kind: LetterKind, c: Copy): string {
  return letterChrome(kind, c).kicker;
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
  const chrome = letterChrome(opts.kind, t(opts.lang));
  return {
    kind: opts.kind,
    lang: opts.lang,
    heading: scrub(opts.draft.heading),
    parties: scrub(opts.draft.parties),
    facts: scrub(opts.draft.facts),
    grounds,
    closing: scrub(opts.draft.closing),
    timeOrStand: scrub(opts.draft.timeOrStand),
    verification: chrome.verificationHeading ? scrub(opts.draft.verification ?? "") : "",
    risks: scrub(opts.draft.risks),
  };
}

export function formatLegalLetter(letter: LegalLetter): string {
  const c = t(letter.lang);
  const chrome = letterChrome(letter.kind, c);
  const groundLines = letter.grounds.flatMap((ground, i) => {
    const block = [`${i + 1}. ${ground.heading}`.trim(), ground.text];
    if (ground.citation) block.push(`${c.letterCitation}: ${ground.citation}`);
    if (ground.url) block.push(`${c.letterUrl}: ${ground.url}`);
    return i === letter.grounds.length - 1 ? block : [...block, ""];
  });

  const followOnBlock = letter.timeOrStand ? ["", chrome.followOnHeading, letter.timeOrStand] : [];
  const groundsBlock = ["", chrome.groundsHeading, ...groundLines];
  const closingBlock = letter.closing ? ["", chrome.closingHeading, letter.closing] : [];
  const bodyOrder = chrome.followOnFirst
    ? [...followOnBlock, ...groundsBlock, ...closingBlock]
    : [...groundsBlock, ...closingBlock, ...followOnBlock];

  return compact([
    `CiteBench · ${chrome.kicker}`,
    letter.heading,
    chrome.withoutPrejudice ? c.withoutPrejudice : "",
    "",
    c.letterParties,
    letter.parties,
    "",
    c.letterFacts,
    letter.facts,
    ...bodyOrder,
    "",
    letter.verification && chrome.verificationHeading ? chrome.verificationHeading : "",
    letter.verification && chrome.verificationHeading ? letter.verification : "",
    "",
    letter.risks ? c.risks : "",
    letter.risks,
    "",
    c.disclaimer,
  ]);
}

export function formatLegalLetterHtml(letter: LegalLetter): string {
  const body = escapeHtml(formatLegalLetter(letter)).replaceAll("\n", "<br>\n");
  const title = escapeHtml(letter.heading || "CiteBench letter");
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
