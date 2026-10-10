import { hostAllowed } from "../research/verify.ts";

export type AskInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type AskBlock =
  | { kind: "p"; inlines: AskInline[] }
  | { kind: "hr" }
  | { kind: "list"; items: { marker: string; inlines: AskInline[] }[] };

/** Turn a model reply that ran items together into real lines. */
export function normalizeAskMarkdown(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/\t/g, "  ");
  text = text.replace(/[ \t]*---[ \t]*/g, "\n\n---\n\n");
  text = text.replace(/[ \t]{2,}(?=(?:[a-zA-Z]|\d{1,2})[.)]\s)/g, "\n");
  text = text.replace(/[ \t]{2,}(?=\*\*)/g, "\n");
  text = text.replace(/([.!?])[ \t]{2,}(?=\S)/g, "$1\n\n");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

const ITEM = /^(?:([-*])|([a-zA-Z]|\d{1,2})[.)])\s+(\S.*)$/;

export function parseInlines(line: string): AskInline[] {
  const out: AskInline[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (!buf) return;
    out.push({ kind: "text", text: buf });
    buf = "";
  };
  while (i < line.length) {
    if (line[i] === "[") {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(line.slice(i));
      if (link && hostAllowed(link[2])) {
        flush();
        out.push({ kind: "link", text: link[1], href: link[2] });
        i += link[0].length;
        continue;
      }
    }
    if (line.startsWith("http://", i) || line.startsWith("https://", i)) {
      const bare = /^https?:\/\/[^\s)]+/.exec(line.slice(i));
      if (bare && hostAllowed(bare[0])) {
        flush();
        const href = bare[0];
        out.push({ kind: "link", text: href.replace(/^https?:\/\//, ""), href });
        i += href.length;
        continue;
      }
    }
    if (line.startsWith("**", i)) {
      const end = line.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ kind: "strong", text: line.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (line[i] === "`") {
      const end = line.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: "code", text: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (line[i] === "*" && line[i + 1] !== "*") {
      const end = line.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ kind: "em", text: line.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += line[i];
    i += 1;
  }
  flush();
  return out.length ? out : [{ kind: "text", text: "" }];
}

export function parseAskMarkdown(raw: string): AskBlock[] {
  const lines = normalizeAskMarkdown(raw).split("\n");
  const blocks: AskBlock[] = [];
  let list: { marker: string; inlines: AskInline[] }[] | null = null;
  let para: string[] = [];

  const closePara = () => {
    const text = para.join(" ").trim();
    para = [];
    if (!text) return;
    blocks.push({ kind: "p", inlines: parseInlines(text) });
  };
  const closeList = () => {
    if (!list?.length) {
      list = null;
      return;
    }
    blocks.push({ kind: "list", items: list });
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closePara();
      closeList();
      continue;
    }
    if (trimmed === "---") {
      closePara();
      closeList();
      blocks.push({ kind: "hr" });
      continue;
    }
    const item = ITEM.exec(trimmed);
    if (item) {
      closePara();
      const marker = item[1] ? "•" : `${item[2]}.`;
      list ??= [];
      list.push({ marker, inlines: parseInlines(item[3] ?? "") });
      continue;
    }
    closeList();
    para.push(trimmed);
  }
  closePara();
  closeList();
  return blocks;
}
