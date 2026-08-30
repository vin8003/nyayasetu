import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { b } from "@/lib/billing/copy";
import { cancelSubscription, getEntitlement, startSubscription } from "@/lib/billing/store";
import { writeEntitlementCache } from "@/lib/billing/cache";
import type { BillingSnapshot } from "@/lib/billing/plan";
import { useChamberLang } from "@/lib/practice/use-lang";

export const Route = createFileRoute("/billing")({ component: BillingPage });

function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function BillingPage() {
  const { lang, onLang } = useChamberLang();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const c = b(lang);
  const [snap, setSnap] = useState<BillingSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getEntitlement()
      .then((next) => {
        writeEntitlementCache(next);
        setSnap(next);
      })
      .catch((err) => {
        if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      });
  }, [user, navigate]);

  async function subscribe() {
    setBusy(true);
    try {
      const next = await startSubscription();
      writeEntitlementCache(next);
      setSnap(next);
      toast.success(c.subscribed);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm(c.cancelPlan)) return;
    setBusy(true);
    try {
      const next = await cancelSubscription();
      writeEntitlementCache(next);
      setSnap(next);
      toast.success(c.cancelled);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell lang={lang} onLang={onLang} active="today">
      {isPending ? <div className="h-40 animate-pulse rounded-xl bg-elevated" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user && snap ? (
        <div className="stagger-in mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{c.kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-3 text-base text-muted">{c.lead}</p>

          <div className="mt-8 rounded-xl bg-paper p-6 text-paper-ink shadow-paper">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-display text-3xl">{c.price}</div>
                <div className="mt-1 text-sm text-paper-muted">{c.perMonth}</div>
              </div>
              <StatusPill snap={snap} lang={lang} />
            </div>
            <p className="mt-4 text-xs text-paper-muted">{c.gst}</p>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-paper-muted">{c.trialOn}</dt>
                <dd className="mt-1 tabular-nums">
                  {snap.trialStarted
                    ? `${formatDay(snap.trialEndsAt)}${snap.status === "trial" ? ` · ${snap.daysLeft} ${c.trialDays}` : ""}`
                    : c.trialIdle}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-paper-muted">{c.accessUntil}</dt>
                <dd className="mt-1 tabular-nums">{formatDay(snap.periodEnd)}</dd>
              </div>
            </dl>
            <h2 className="mt-8 text-sm font-medium">{c.includes}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[c.itemTrial, c.itemResearch, c.itemChamber, c.itemOrders].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-accent" aria-hidden>
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              {snap.status === "active" ? (
                <Button variant="outline" onClick={() => void cancel()} disabled={busy}>
                  {c.cancelPlan}
                </Button>
              ) : (
                <Button onClick={() => void subscribe()} disabled={busy}>
                  {busy ? c.subscribing : c.subscribe}
                </Button>
              )}
              <p className="text-xs leading-relaxed text-paper-muted">{c.confirmHint}</p>
            </div>
          </div>
          <p className="mt-8">
            <Link to="/" className="text-sm text-muted hover:text-fg">
              ← CiteBench
            </Link>
          </p>
        </div>
      ) : null}
    </AppShell>
  );
}

function StatusPill({ snap, lang }: { snap: BillingSnapshot; lang: "hi" | "en" }) {
  const c = b(lang);
  const label =
    snap.status === "trial"
      ? snap.trialStarted
        ? `${c.trialOn} · ${snap.daysLeft} ${c.trialDays}`
        : c.trialIdle
      : snap.status === "active"
        ? c.paidOn
        : snap.status === "cancelled"
          ? c.cancelledOn
          : c.expired;
  return (
    <div className="rounded-full px-3 py-1 text-xs font-medium shadow-[0_0_0_1px_rgb(0_0_0/0.12)]">{label}</div>
  );
}
