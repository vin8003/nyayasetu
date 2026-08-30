import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ResearchDesk } from "@/components/research-desk";
import { useChamberLang } from "@/lib/practice/use-lang";

export const Route = createFileRoute("/research")({
  validateSearch: (search: Record<string, unknown>) => ({
    matter: typeof search.matter === "string" && search.matter.length > 0 ? search.matter : undefined,
  }),
  component: ResearchPage,
});

function ResearchPage() {
  const { lang, onLang } = useChamberLang();
  const { matter } = Route.useSearch();
  return (
    <AppShell lang={lang} onLang={onLang} active="research">
      <ResearchDesk lang={lang} matterId={matter} />
    </AppShell>
  );
}
