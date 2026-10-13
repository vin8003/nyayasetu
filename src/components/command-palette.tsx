import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  BookOpen,
  CalendarDays,
  FilePlus2,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  ScanSearch,
  Search,
} from "lucide-react";
import { onPalette, openNewMatter } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMatters } from "@/lib/practice/store";
import type { OutputLang } from "@/lib/research/types";

type MatterHit = { id: string; title: string; caseNumber?: string; courtName?: string; cnr?: string };

const COPY = {
  en: {
    open: "Search",
    placeholder: "Find a matter, or type a command…",
    empty: "No matches.",
    go: "Go to",
    actions: "Start",
    matters: "Matters",
    today: "Today",
    diary: "Diary",
    matterList: "Matters",
    research: "Research",
    ask: "Ask",
    inbox: "Inbox",
    cnr: "Bring in a case by CNR",
    newMatter: "New matter by hand",
    newResearch: "New research memo",
    newAsk: "Ask a quick question",
  },
  hi: {
    open: "खोजें",
    placeholder: "मामला खोजें या कमांड लिखें…",
    empty: "कुछ नहीं मिला।",
    go: "जाएँ",
    actions: "शुरू करें",
    matters: "मामले",
    today: "आज",
    diary: "डायरी",
    matterList: "मामले",
    research: "शोध",
    ask: "पूछें",
    inbox: "इनबॉक्स",
    cnr: "CNR से केस लाएँ",
    newMatter: "हाथ से नया मामला",
    newResearch: "नया शोध मेमो",
    newAsk: "छोटा सवाल पूछें",
  },
} as const;

/** ⌘K / Ctrl+K: the fastest route to any matter, page, or action. */
export function CommandPalette({ lang }: { lang: OutputLang }) {
  const c = COPY[lang];
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [matters, setMatters] = useState<MatterHit[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    const off = onPalette(() => setOpen(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      off();
    };
  }, []);

  useEffect(() => {
    if (!open || !user) return;
    listMatters()
      .then((rows) => setMatters(rows as MatterHit[]))
      .catch(() => setMatters([]));
  }, [open, user?.id]);

  function go(to: string, params?: Record<string, string>) {
    setOpen(false);
    navigate({ to, params } as never);
  }

  const pages = [
    { to: "/", label: c.today, icon: LayoutDashboard },
    { to: "/diary", label: c.diary, icon: CalendarDays },
    { to: "/matters", label: c.matterList, icon: FolderOpen },
    { to: "/research", label: c.research, icon: BookOpen },
    { to: "/ask", label: c.ask, icon: MessageSquare },
    { to: "/inbox", label: c.inbox, icon: Inbox },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={c.open}
      className="cmdk"
      overlayClassName="cmdk-overlay"
      contentClassName="cmdk-content"
    >
      <div className="cmdk-input-wrap">
        <Search className="size-4 text-subtle" aria-hidden />
        <Command.Input placeholder={c.placeholder} className="cmdk-input" />
        <kbd className="kbd">Esc</kbd>
      </div>
      <Command.List className="cmdk-list">
        <Command.Empty className="cmdk-empty">{c.empty}</Command.Empty>
        {matters.length > 0 ? (
          <Command.Group heading={c.matters}>
            {matters.map((m) => (
              <Command.Item
                key={m.id}
                value={`${m.title} ${m.caseNumber ?? ""} ${m.courtName ?? ""} ${m.cnr ?? ""} ${m.id}`}
                onSelect={() => go("/matters/$id", { id: m.id })}
                className="cmdk-item"
              >
                <FolderOpen className="size-4" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{m.title}</span>
                <span className="cmdk-hint truncate">{m.caseNumber || m.courtName}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {user ? (
          <Command.Group heading={c.actions}>
            <Command.Item
              value={`${c.cnr} cnr fetch case`}
              onSelect={() => {
                setOpen(false);
                openNewMatter({ mode: "cnr" });
              }}
              className="cmdk-item"
            >
              <ScanSearch className="size-4" aria-hidden /> {c.cnr}
            </Command.Item>
            <Command.Item
              value={`${c.newMatter} new matter`}
              onSelect={() => {
                setOpen(false);
                openNewMatter({ mode: "manual" });
              }}
              className="cmdk-item"
            >
              <FilePlus2 className="size-4" aria-hidden /> {c.newMatter}
            </Command.Item>
            <Command.Item value={`${c.newResearch} research memo`} onSelect={() => go("/research")} className="cmdk-item">
              <BookOpen className="size-4" aria-hidden /> {c.newResearch}
            </Command.Item>
            <Command.Item value={`${c.newAsk} ask question chat`} onSelect={() => go("/ask")} className="cmdk-item">
              <MessageSquare className="size-4" aria-hidden /> {c.newAsk}
            </Command.Item>
          </Command.Group>
        ) : null}
        <Command.Group heading={c.go}>
          {pages.map((pg) => (
            <Command.Item key={pg.to} value={`${pg.label} ${pg.to}`} onSelect={() => go(pg.to)} className="cmdk-item">
              <pg.icon className="size-4" aria-hidden /> {pg.label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
