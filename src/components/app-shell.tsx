import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, FolderOpen, Inbox, LayoutDashboard, Search } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { BillingBanner, PlanStatus } from "@/components/billing-banner";
import { CiteMark } from "@/components/cite-mark";
import { CommandPalette } from "@/components/command-palette";
import { NewMatterPanel } from "@/components/new-matter";
import { NewMenu } from "@/components/new-menu";
import { adminNavFlag } from "@/lib/admin/store";
import { onCountsChanged, openPalette } from "@/lib/app-events";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { p } from "@/lib/practice/copy";
import { getNavCounts } from "@/lib/practice/store";
import type { OutputLang } from "@/lib/research/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", key: "today", icon: LayoutDashboard },
  { to: "/diary", key: "diary", icon: CalendarDays },
  { to: "/matters", key: "matters", icon: FolderOpen },
  { to: "/research", key: "research", icon: BookOpen },
  { to: "/inbox", key: "inbox", icon: Inbox },
] as const;

type NavKey = (typeof NAV)[number]["key"];

let countsCache: { userId: string; inbox: number } | null = null;
let adminCache: { userId: string; admin: boolean } | null = null;

/** Inbox badge. Paints the last known count, then refreshes. */
function useNavCounts(userId: string | undefined) {
  const [inbox, setInbox] = useState(() => (countsCache && countsCache.userId === userId ? countsCache.inbox : 0));
  useEffect(() => {
    if (!userId) {
      setInbox(0);
      return;
    }
    let live = true;
    const load = () =>
      getNavCounts()
        .then((row) => {
          countsCache = { userId, inbox: row.inbox };
          if (live) setInbox(row.inbox);
        })
        .catch(() => undefined);
    void load();
    const off = onCountsChanged(() => void load());
    return () => {
      live = false;
      off();
    };
  }, [userId]);
  return { inbox };
}

function useIsAdmin(userId: string | undefined) {
  const [admin, setAdmin] = useState(() => (adminCache && adminCache.userId === userId ? adminCache.admin : false));
  useEffect(() => {
    if (!userId) {
      setAdmin(false);
      return;
    }
    let live = true;
    adminNavFlag()
      .then((row) => {
        adminCache = { userId, admin: Boolean(row?.admin) };
        if (live) setAdmin(adminCache.admin);
      })
      .catch(() => {
        if (live) setAdmin(false);
      });
    return () => {
      live = false;
    };
  }, [userId]);
  return admin;
}

export function AppShell({
  lang,
  onLang,
  active,
  children,
}: {
  lang: OutputLang;
  onLang: (next: OutputLang) => void;
  active: NavKey | "none";
  children: ReactNode;
}) {
  const c = p(lang);
  const { user } = useCurrentUserState();
  const isAdmin = useIsAdmin(user?.id);
  const { inbox } = useNavCounts(user?.id);
  const labels: Record<NavKey, string> = {
    today: c.today,
    diary: c.diary,
    matters: c.matters,
    research: c.research,
    inbox: c.inbox,
  };
  const searchLabel = lang === "hi" ? "खोजें" : "Search";

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        {lang === "hi" ? "मुख्य भाग पर जाएँ" : "Skip to content"}
      </a>
      <CommandPalette lang={lang} />
      {user ? <NewMatterPanel lang={lang} /> : null}

      <aside className="sidebar no-print" aria-label={c.app}>
        <div className="side-top">
          <Link to="/" className="brand" aria-label={c.app}>
            <CiteMark className="size-6" />
            <span className="brand-word" translate="no">
              {c.app}
            </span>
          </Link>
          <button type="button" className="icon-btn" aria-label={searchLabel} title={`${searchLabel} (⌘K)`} onClick={openPalette}>
            <Search className="size-4" aria-hidden />
          </button>
        </div>

        {user ? (
          <div className="mb-3">
            <NewMenu lang={lang} />
          </div>
        ) : null}

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
                <Icon className="size-4" aria-hidden />
                {labels[item.key]}
                {item.key === "inbox" && inbox > 0 ? (
                  <span className="count-badge" aria-label={`${inbox}`}>
                    {inbox}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="side-foot">
          <PlanStatus lang={lang} />
          <AccountMenu lang={lang} onLang={onLang} isAdmin={isAdmin} />
        </div>
      </aside>

      <div className="shell-col">
        <header className="topbar no-print">
          <div className="topbar-inner">
            <Link to="/" className="brand" aria-label={c.app}>
              <CiteMark className="size-6" />
              <span className="brand-word" translate="no">
                {c.app}
              </span>
            </Link>
            <div className="topbar-actions">
              {user ? <NewMenu lang={lang} compact /> : null}
              <button type="button" className="icon-btn" aria-label={searchLabel} onClick={openPalette}>
                <Search className="size-4" aria-hidden />
              </button>
              <AccountMenu lang={lang} onLang={onLang} isAdmin={isAdmin} compact />
            </div>
          </div>
        </header>

        <BillingBanner lang={lang} />

        <main id="main" className="shell-main" tabIndex={-1}>
          {children}
        </main>
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
                <Icon className="size-5" strokeWidth={on ? 2.1 : 1.75} aria-hidden />
                {labels[item.key]}
                {item.key === "inbox" && inbox > 0 ? <span className="count-badge">{inbox}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
