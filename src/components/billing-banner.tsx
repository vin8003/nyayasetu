import { Link, useRouterState } from "@tanstack/react-router";
import { b } from "@/lib/billing/copy";
import { useEntitlement } from "@/lib/billing/use-entitlement";
import type { OutputLang } from "@/lib/research/types";

/** Phone strip: only when the trial is nearly over or has ended. */
export function BillingBanner({ lang }: { lang: OutputLang }) {
  const snap = useEntitlement();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const c = b(lang);
  if (!snap || pathname.startsWith("/billing")) return null;

  const ended = !snap.canUseAi && snap.status !== "active";
  const ending = snap.status === "trial" && snap.trialStarted && snap.daysLeft <= 5;
  if (!ended && !ending) return null;

  return (
    <div className="banner no-print min-[900px]:hidden">
      <div className="banner-inner">
        <p className={ended ? "font-medium" : "text-muted"}>
          {ended ? c.bannerExpired : `${c.bannerTrial} · ${snap.daysLeft} ${c.bannerLeft}`}
        </p>
        <Link to="/billing" className="link-accent">
          {ended ? c.subscribe : c.seePlan}
        </Link>
      </div>
    </div>
  );
}

/** Sidebar card: trial clock and live-CNR allowance, or a nudge once it ends. */
export function PlanStatus({ lang }: { lang: OutputLang }) {
  const snap = useEntitlement();
  const c = b(lang);
  if (!snap) return null;
  if (snap.status === "active" || (snap.status === "cancelled" && snap.canUseAi)) return null;

  if (snap.status === "trial" && !snap.trialStarted) {
    return (
      <Link to="/billing" className="side-trial">
        <span className="font-medium">{c.sideTrialIdle}</span>
        <span className="mt-0.5 block text-xs text-muted">{c.sideTrialIdleHint}</span>
      </Link>
    );
  }

  if (snap.status === "trial" && snap.canUseAi) {
    const used = Math.max(0, 30 - snap.daysLeft);
    return (
      <Link to="/billing" className="side-trial">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{c.bannerTrial}</span>
          <span className="tabular-nums text-muted">
            {snap.daysLeft} {c.bannerLeft}
          </span>
        </span>
        <span className="meter block" aria-hidden>
          <span style={{ width: `${Math.min(100, Math.max(4, (used / 30) * 100))}%` }} />
        </span>
        {snap.cnrFetchesLeft != null ? (
          <span className="mt-1.5 block text-xs text-muted tabular-nums">
            {snap.cnrFetchesLeft} {c.bannerFetches}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link to="/billing" className="side-trial">
      <span className="font-medium">{c.bannerExpired}</span>
      <span className="mt-0.5 block text-xs text-accent">{c.subscribe}</span>
    </Link>
  );
}
