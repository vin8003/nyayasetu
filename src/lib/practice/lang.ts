import type { OutputLang } from "@/lib/research/types";

export const KEY = "citebench.lang";
export function readLang(): OutputLang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "hi" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "en";
}
export function writeLang(lang: OutputLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
}
