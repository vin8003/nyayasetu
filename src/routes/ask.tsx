import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AskDesk } from "@/components/ask-desk";
import { useChamberLang } from "@/lib/practice/use-lang";

export const Route = createFileRoute("/ask")({
  validateSearch: (search: Record<string, unknown>): { matter?: string; chat?: string } => ({
    matter: typeof search.matter === "string" && search.matter.length > 0 ? search.matter : undefined,
    chat: typeof search.chat === "string" && search.chat.length > 0 ? search.chat : undefined,
  }),
  component: AskPage,
});

function AskPage() {
  const { lang, onLang } = useChamberLang();
  const { matter, chat } = Route.useSearch();
  return (
    <AppShell lang={lang} onLang={onLang} active="ask">
      <AskDesk lang={lang} matterId={matter} chatId={chat} />
    </AppShell>
  );
}
