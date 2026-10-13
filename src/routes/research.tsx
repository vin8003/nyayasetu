import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ResearchDesk } from "@/components/research-desk";
import { ResearchModes } from "@/components/research-modes";
import { useChamberLang } from "@/lib/practice/use-lang";

type ResearchSearch = { matter?: string; memo?: string; view?: "history" };

export const Route = createFileRoute("/research")({
  validateSearch: (search: Record<string, unknown>): ResearchSearch => ({
    matter: typeof search.matter === "string" && search.matter.length > 0 ? search.matter : undefined,
    memo: typeof search.memo === "string" && search.memo.length > 0 ? search.memo : undefined,
    view: search.view === "history" ? "history" : undefined,
  }),
  component: ResearchPage,
});

function ResearchPage() {
  const { lang, onLang } = useChamberLang();
  const { matter, memo, view } = Route.useSearch();
  return (
    <AppShell lang={lang} onLang={onLang} active="research">
      <ResearchDesk lang={lang} matterId={matter} memoId={memo} history={view === "history"}>
        <ResearchModes lang={lang} mode={view === "history" ? "history" : "brief"} matter={matter} memo={memo} />
      </ResearchDesk>
    </AppShell>
  );
}
