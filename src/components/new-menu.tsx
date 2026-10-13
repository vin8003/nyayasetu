import { useNavigate } from "@tanstack/react-router";
import { BookOpen, FilePlus2, Gavel, MessageSquare, Plus, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { openNewMatter } from "@/lib/app-events";
import type { OutputLang } from "@/lib/research/types";

const COPY = {
  en: {
    label: "New",
    cnr: "Case from CNR",
    cnrHint: "Pull a live case and its orders",
    manual: "Matter by hand",
    manualHint: "Open a file without a CNR",
    research: "Research memo",
    researchHint: "Facts in, authorities out",
    ask: "Quick question",
    askHint: "A short answer with sources",
    order: "Paste an order",
    orderHint: "Read directions into a file",
  },
  hi: {
    label: "नया",
    cnr: "CNR से केस",
    cnrHint: "लाइव केस और आदेश लाएँ",
    manual: "हाथ से मामला",
    manualHint: "CNR के बिना फ़ाइल खोलें",
    research: "शोध मेमो",
    researchHint: "तथ्य दें, नज़ीरें पाएँ",
    ask: "छोटा सवाल",
    askHint: "स्रोत सहित छोटा जवाब",
    order: "आदेश चिपकाएँ",
    orderHint: "निर्देश फ़ाइल में पढ़ें",
  },
} as const;

/** The one place to start anything. Lives in the sidebar and the phone top bar. */
export function NewMenu({ lang, compact = false }: { lang: OutputLang; compact?: boolean }) {
  const c = COPY[lang];
  const navigate = useNavigate();
  return (
    <Menu>
      <MenuTrigger asChild>
        {compact ? (
          <button type="button" className="icon-btn" aria-label={c.label}>
            <Plus className="size-[1.125rem]" aria-hidden />
          </button>
        ) : (
          <Button className="w-full justify-start">
            <Plus className="size-4" aria-hidden />
            {c.label}
          </Button>
        )}
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"} className="w-72">
        <MenuItem icon={<ScanSearch className="size-4" />} hint={c.cnrHint} onSelect={() => openNewMatter({ mode: "cnr" })}>
          {c.cnr}
        </MenuItem>
        <MenuItem icon={<FilePlus2 className="size-4" />} hint={c.manualHint} onSelect={() => openNewMatter({ mode: "manual" })}>
          {c.manual}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<BookOpen className="size-4" />}
          hint={c.researchHint}
          onSelect={() => navigate({ to: "/research", search: { matter: undefined, memo: undefined } })}
        >
          {c.research}
        </MenuItem>
        <MenuItem
          icon={<MessageSquare className="size-4" />}
          hint={c.askHint}
          onSelect={() => navigate({ to: "/ask", search: { matter: undefined, chat: undefined, memo: undefined } })}
        >
          {c.ask}
        </MenuItem>
        <MenuItem icon={<Gavel className="size-4" />} hint={c.orderHint} onSelect={() => navigate({ to: "/inbox", search: { matter: undefined } })}>
          {c.order}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
