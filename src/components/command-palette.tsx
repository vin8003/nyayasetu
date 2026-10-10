import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { BookOpen, CalendarDays, FolderOpen, FolderPlus, Inbox, LayoutDashboard, Moon, Search } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMatters } from "@/lib/practice/store";
import type { OutputLang } from "@/lib/research/types";
import { applyTheme, currentTheme } from "@/lib/theme";

type MatterHit = { id: string; title: string; caseNumber?: string; courtName?: string };

const COPY = {
  en: {
    open: "Search or jump to…",
    placeholder: "Search matters, jump to a page, or run an action",
    empty: "Nothing found.",
    go: "Go to",
    actions: "Actions",
    matters: "Matters",
    today: "Today",
    diary: "Diary",
    matterList: "All matters",
    research: "Research",
    inbox: "Inbox",
    newMatter: "New matter",
    theme: "Toggle light / dark theme",
  },
  hi: {
    open: "खोजें या कहीं जाएँ…",
    placeholder: "मामला खोजें, पेज पर जाएँ, या कार्रवाई चुनें",
    empty: "कुछ नहीं मिला।",
    go: "जाएँ",
    actions: "कार्रवाई",
    matters: "मामले",
    today: "आज",
    diary: "डायरी",
    matterList: "सभी मामले",
    research: "शोध",
    inbox: "इनबॉक्स",
    newMatter: "नया मामला",
    theme: "लाइट / डार्क थीम बदलें",
  },
} as const;

/** ⌘K / Ctrl+K — the fastest route to any matter or page. */
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
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cb:palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cb:palette", onOpen);
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
    { to: "/inbox", label: c.inbox, icon: Inbox },
  ];

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label={c.open} className="cmdk" overlayClassName="cmdk-overlay" contentClassName="cmdk-content">
      <div className="cmdk-input-wrap">
        <Search className="size-4 text-muted" aria-hidden />
        <Command.Input placeholder={c.placeholder} className="cmdk-input" />
      </div>
      <Command.List className="cmdk-list">
        <Command.Empty className="cmdk-empty">{c.empty}</Command.Empty>
        <Command.Group heading={c.actions}>
          <Command.Item value={`${c.newMatter} new matter`} onSelect={() => go("/matters")} className="cmdk-item">
            <FolderPlus className="size-4" aria-hidden /> {c.newMatter}
          </Command.Item>
          <Command.Item
            value={c.theme}
            onSelect={() => {
              applyTheme(currentTheme() === "dark" ? "light" : "dark");
              setOpen(false);
            }}
            className="cmdk-item"
          >
            <Moon className="size-4" aria-hidden /> {c.theme}
          </Command.Item>
        </Command.Group>
        <Command.Group heading={c.go}>
          {pages.map((pg) => (
            <Command.Item key={pg.to} value={`${pg.label} ${pg.to}`} onSelect={() => go(pg.to)} className="cmdk-item">
              <pg.icon className="size-4" aria-hidden /> {pg.label}
            </Command.Item>
          ))}
        </Command.Group>
        {matters.length > 0 ? (
          <Command.Group heading={c.matters}>
            {matters.map((m) => (
              <Command.Item
                key={m.id}
                value={`${m.title} ${m.caseNumber ?? ""} ${m.courtName ?? ""} ${m.id}`}
                onSelect={() => go("/matters/$id", { id: m.id })}
                className="cmdk-item"
              >
                <FolderOpen className="size-4" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{m.title}</span>
                <span className="cmdk-hint">{m.caseNumber || m.courtName}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
      </Command.List>
    </Command.Dialog>
  );
}

export function PaletteButton({ lang, className }: { lang: OutputLang; className?: string }) {
  const c = COPY[lang];
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("cb:palette"))} className={className ?? "search-btn"}>
      <Search className="size-4" aria-hidden />
      <span className="search-btn-text">{c.open}</span>
      <kbd className="kbd">⌘K</kbd>
    </button>
  );
}
