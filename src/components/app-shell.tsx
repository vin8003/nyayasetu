import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, FolderOpen, Inbox, LayoutDashboard } from "lucide-react";
import { AuthChip } from "@/components/auth-chip";
import { BillingBanner } from "@/components/billing-banner";
import { CiteMark } from "@/components/cite-mark";
import { p } from "@/lib/practice/copy";
import type { OutputLang } from "@/lib/research/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "today", icon: LayoutDashboard },
  { to: "/diary", key: "diary", icon: CalendarDays },
  { to: "/matters", key: "matters", icon: FolderOpen },
  { to: "/research", key: "research", icon: BookOpen },
  { to: "/inbox", key: "inbox", icon: Inbox },
] as const;

export function AppShell({
  lang,
  onLang,
  active,
  children,
}: {
  lang: OutputLang;
  onLang: (next: OutputLang) => void;
  active: (typeof NAV)[number]["key"];
  children: ReactNode;
}) {
  const c = p(lang);
  const labels = {
    today: c.today,
    diary: c.diary,
    matters: c.matters,
    research: c.research,
    inbox: c.inbox,
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="no-print sticky top-0 z-20 border-b border-border/80 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label={c.app}>
            <CiteMark className="size-7" />
            <span className="hidden font-display text-lg tracking-tight sm:inline">{c.app}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex h-10 items-center rounded-md px-3 text-sm",
                  active === item.key ? "bg-elevated text-fg" : "text-muted hover:text-fg",
                )}
              >
                {labels[item.key]}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md bg-elevated p-0.5 shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
              {(["hi", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onLang(code)}
                  className={
                    lang === code
                      ? "h-8 rounded-sm px-2.5 text-xs font-medium bg-accent text-accent-fg"
                      : "h-8 rounded-sm px-2.5 text-xs font-medium text-muted hover:text-fg"
                  }
                >
                  {code === "hi" ? "हि" : "EN"}
                </button>
              ))}
            </div>
            <AuthChip lang={lang} />
          </div>
        </div>
      </header>
      <BillingBanner lang={lang} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:py-10 md:pb-12">{children}</main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-bg/95 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active === item.key;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]",
                  on ? "text-fg" : "text-muted",
                )}
              >
                <Icon className="size-4" />
                {labels[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
