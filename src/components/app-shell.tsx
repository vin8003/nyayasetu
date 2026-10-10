import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, FolderOpen, Inbox, LayoutDashboard, Search, Shield } from "lucide-react";
import { AuthChip } from "@/components/auth-chip";
import { BillingBanner } from "@/components/billing-banner";
import { CiteMark } from "@/components/cite-mark";
import { CommandPalette, PaletteButton } from "@/components/command-palette";
import { LangToggle } from "@/components/lang-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { adminNavFlag } from "@/lib/admin/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
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
  const { user } = useCurrentUserState();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancel = false;
    adminNavFlag()
      .then((row) => {
        if (!cancel) setIsAdmin(Boolean(row?.admin));
      })
      .catch(() => {
        if (!cancel) setIsAdmin(false);
      });
    return () => {
      cancel = true;
    };
  }, [user?.id]);
  const labels = {
    today: c.today,
    diary: c.diary,
    matters: c.matters,
    research: c.research,
    inbox: c.inbox,
    admin: c.admin,
  };

  return (
    <div className="shell">
      <CommandPalette lang={lang} />

      {/* Desktop: persistent sidebar. */}
      <aside className="sidebar no-print">
        <Link to="/" className="brand" aria-label={c.app}>
          <CiteMark className="size-8" />
          <span className="brand-word">{c.app}</span>
        </Link>

        <PaletteButton lang={lang} />

        <nav className="side-nav" aria-label={c.app}>
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active === item.key;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn("side-link", on && "is-on")}
                aria-current={on ? "page" : undefined}
              >
                <Icon className="size-[1.1rem]" aria-hidden />
                {labels[item.key]}
              </Link>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="side-tools">
            <LangToggle lang={lang} onLang={onLang} ariaLabel={c.langLabel} />
            <ThemeToggle lang={lang} />
          </div>
          <AuthChip lang={lang} />
        </div>
      </aside>

      <div className="shell-col">
        {isAdmin ? (
          <div className="desk-admin-bar no-print">
            <Link to="/admin" className="top-admin">
              <Shield className="size-4" aria-hidden />
              {c.admin}
            </Link>
          </div>
        ) : null}
        {/* Mobile: slim top bar. */}
        <header className="topbar no-print">
          <div className="topbar-inner">
            <Link to="/" className="brand" aria-label={c.app}>
              <CiteMark className="size-7" />
              <span className="brand-word">{c.app}</span>
            </Link>
            <div className="topbar-actions">
              {isAdmin ? (
                <Link to="/admin" className="top-admin">
                  <Shield className="size-4" aria-hidden />
                  {c.admin}
                </Link>
              ) : null}
              <button
                type="button"
                className="icon-btn"
                aria-label={lang === "hi" ? "खोजें" : "Search"}
                onClick={() => window.dispatchEvent(new Event("cb:palette"))}
              >
                <Search className="size-4" aria-hidden />
              </button>
              <ThemeToggle lang={lang} />
              <LangToggle lang={lang} onLang={onLang} ariaLabel={c.langLabel} />
              <AuthChip lang={lang} />
            </div>
          </div>
        </header>

        <BillingBanner lang={lang} />

        <main className="shell-main">{children}</main>
      </div>

      <nav className="tabbar no-print" aria-label={c.app}>
        <div className="tabbar-inner">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active === item.key;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn("tab-link", on && "is-on")}
                aria-current={on ? "page" : undefined}
              >
                <span className="tab-icon">
                  <Icon className="size-[1.15rem]" />
                </span>
                {labels[item.key]}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
