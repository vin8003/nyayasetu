import { t } from "./copy.ts";
import type { LegalMemo, OutputLang } from "./types.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatMemoBrief(memo: LegalMemo, lang: OutputLang): string {
  const c = t(lang);
  const lines: string[] = [
    "NyayaSetu · research memorandum",
    memo.title,
    memo.causeTitle,
    "",
    c.facts,
    memo.factsSummary || memo.fullMemo,
    "",
    c.issues,
    ...memo.issues.map((issue, i) => `${i + 1}. ${issue.issue}${issue.framing ? ` — ${issue.framing}` : ""}`),
    "",
    c.precedents,
    ...memo.precedents.map((precedent) => {
      const flag = precedent.verified ? "verified" : "unverified";
      return `- ${precedent.title} | ${precedent.citation} | ${precedent.url} | ${flag}`;
    }),
    "",
    c.forSide,
    ...memo.argumentsFor.map((item, i) => `${i + 1}. ${item}`),
    "",
    c.against,
    ...memo.argumentsAgainst.map((item, i) => `${i + 1}. ${item}`),
    "",
    c.counters,
    ...memo.counters.map((item, i) => `${i + 1}. ${item}`),
    "",
    c.disclaimer,
  ];
  return lines.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n").trim();
}

export function formatMemoBriefHtml(memo: LegalMemo, lang: OutputLang): string {
  const body = escapeHtml(formatMemoBrief(memo, lang)).replaceAll("\n", "<br>\n");
  const title = escapeHtml(memo.title || "NyayaSetu memo");
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
