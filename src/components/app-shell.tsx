import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, FolderOpen, Inbox, LayoutDashboard } from "lucide-react";
import { AuthChip } from "@/components/auth-chip";
import { BillingBanner } from "@/components/billing-banner";
import { CiteMark } from "@/components/cite-mark";
import { LangToggle } from "@/components/lang-toggle";
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
    <div className="shell">
      <header className="topbar no-print">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label={c.app}>
            <CiteMark className="size-7" />
            <span className="brand-word hidden sm:inline">{c.app}</span>
          </Link>

          <nav className="nav" aria-label={c.app}>
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn("nav-link", active === item.key && "is-on")}
                aria-current={active === item.key ? "page" : undefined}
              >
                {labels[item.key]}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onLang={onLang} ariaLabel={c.langLabel} />
            <AuthChip lang={lang} />
          </div>
        </div>
      </header>

      <BillingBanner lang={lang} />

      <main className="shell-main">{children}</main>

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
