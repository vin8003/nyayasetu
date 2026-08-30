import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { b } from "@/lib/billing/copy";
import { getEntitlement } from "@/lib/billing/store";
import type { BillingSnapshot } from "@/lib/billing/plan";
import type { OutputLang } from "@/lib/research/types";

export function BillingBanner({ lang }: { lang: OutputLang }) {
  const { user } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [snap, setSnap] = useState<BillingSnapshot | null>(null);
  const c = b(lang);

  useEffect(() => {
    if (!user) {
      setSnap(null);
      return;
    }
    getEntitlement()
      .then(setSnap)
      .catch(() => setSnap(null));
  }, [user?.id]);

  if (!user || !snap || pathname.startsWith("/billing")) return null;
  if (snap.status === "active") return null;
  if (snap.status === "cancelled" && snap.canUseAi) return null;

  if (snap.status === "trial") {
    return (
      <div className="no-print border-b border-border/80 bg-elevated/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
          <p>
            {snap.trialStarted ? (
              <>
                <span className="font-medium text-accent">{c.bannerTrial}</span>
                <span className="text-muted">
                  {" "}
                  · {snap.daysLeft} {c.bannerLeft}
                </span>
              </>
            ) : (
              <span className="text-muted">{c.bannerIdle}</span>
            )}
          </p>
          <Link to="/billing" className="text-sm text-accent hover:text-fg">
            {c.seePlan}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="no-print border-b border-border/80 bg-elevated">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="font-medium">{c.bannerExpired}</p>
        <Link to="/billing" className="text-sm text-accent hover:text-fg">
          {c.subscribe}
        </Link>
      </div>
    </div>
  );
}
