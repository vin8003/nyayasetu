export type ThemeChoice = "light" | "dark";

const KEY = "cb-theme";

/** Inline in <head> so the right theme paints on the very first frame (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function currentTheme(): ThemeChoice {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(next: ThemeChoice) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* private mode: the choice just will not persist */
  }
}
