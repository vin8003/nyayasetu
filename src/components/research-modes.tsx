import { Link } from "@tanstack/react-router";
import { t } from "@/lib/research/copy";
import type { OutputLang } from "@/lib/research/types";

/** Research's three ways in: write a memo, ask a quick question, or reopen past work. */
export function ResearchModes({
  lang,
  mode,
  matter,
}: {
  lang: OutputLang;
  mode: "brief" | "ask" | "history";
  matter?: string;
  memo?: string;
}) {
  const c = t(lang);
  return (
    <nav className="research-modes tabs" aria-label={c.pageTitle}>
      <Link
        to="/research"
        search={{ matter, memo: undefined, view: undefined }}
        className="tab"
        aria-current={mode === "brief" ? "page" : undefined}
        data-on={mode === "brief" || undefined}
      >
        {c.tabMemo}
      </Link>
      <Link
        to="/ask"
        search={{ matter, chat: undefined, memo: undefined }}
        className="tab"
        aria-current={mode === "ask" ? "page" : undefined}
        data-on={mode === "ask" || undefined}
      >
        {c.tabAsk}
      </Link>
      <Link
        to="/research"
        search={{ matter: undefined, memo: undefined, view: "history" }}
        className="tab"
        aria-current={mode === "history" ? "page" : undefined}
        data-on={mode === "history" || undefined}
      >
        {c.tabHistory}
      </Link>
    </nav>
  );
}
