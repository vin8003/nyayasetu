import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { b } from "@/lib/billing/copy";
import { getEntitlement } from "@/lib/billing/store";
import { readEntitlementCache, writeEntitlementCache } from "@/lib/billing/cache";
import type { BillingSnapshot } from "@/lib/billing/plan";
import type { OutputLang } from "@/lib/research/types";

export function BillingBanner({ lang }: { lang: OutputLang }) {
  const { user } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [snap, setSnap] = useState<BillingSnapshot | null>(() => readEntitlementCache());
  const c = b(lang);

  useEffect(() => {
    if (!user) {
      setSnap(null);
      return;
    }
    getEntitlement()
      .then((next) => {
        writeEntitlementCache(next);
        setSnap(next);
      })
      .catch(() => setSnap(null));
  }, [user?.id]);

  if (!user || !snap || pathname.startsWith("/billing")) return null;
  if (snap.status === "active") return null;
  if (snap.status === "cancelled" && snap.canUseAi) return null;

  if (snap.status === "trial") {
    return (
      <div className="banner no-print">
        <div className="banner-inner">
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
          <Link to="/billing" className="link-accent text-sm">
            {c.seePlan}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="banner banner-strong no-print">
      <div className="banner-inner">
        <p className="font-medium">{c.bannerExpired}</p>
        <Link to="/billing" className="link-accent text-sm">
          {c.subscribe}
        </Link>
      </div>
    </div>
  );
}
