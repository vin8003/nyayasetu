import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { GuestPanel } from "@/components/guest-panel";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { openRazorpayCheckout } from "@/lib/billing/checkout";
import { b } from "@/lib/billing/copy";
import { cancelSubscription, confirmCheckout, getEntitlement, startSubscription } from "@/lib/billing/store";
import { writeEntitlementCache } from "@/lib/billing/cache";
import type { BillingSnapshot } from "@/lib/billing/plan";
import { useChamberLang } from "@/lib/practice/use-lang";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function failMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message && !/unauthorized/i.test(err.message)) return err.message;
  return fallback;
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
      const result = await startSubscription();
      if (result.kind === "unset") {
        writeEntitlementCache(result.snap);
        setSnap(result.snap);
        toast.error(c.paymentsUnset);
        return;
      }
      if (result.kind === "preview" || result.kind === "active") {
        writeEntitlementCache(result.snap);
        setSnap(result.snap);
        toast.success(c.subscribed);
        return;
      }
      if (result.kind === "covered") {
        writeEntitlementCache(result.snap);
        setSnap(result.snap);
        toast.message(c.leftoverHint);
        return;
      }
      const paid = await openRazorpayCheckout(result.checkout);
      if (!paid) {
        toast.message(c.checkoutDismissed);
        return;
      }
      const next = await confirmCheckout({ data: paid });
      writeEntitlementCache(next);
      setSnap(next);
      toast.success(c.subscribed);
    } catch (err) {
      if (/unauthorized/i.test(String(err))) navigate({ to: "/login" });
      else toast.error(failMessage(err, c.payFailed));
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
      else toast.error(failMessage(err, c.payFailed));
    } finally {
      setBusy(false);
    }
  }

  const live = Boolean(snap?.paymentsLive);

  return (
    <AppShell lang={lang} onLang={onLang} active="none">
      {isPending ? <div className="skeleton h-40" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user && snap ? (
        <div>
          <header className="page-head">
            <div className="page-head-text">
              <h1 className="page-title">{c.title}</h1>
              <p className="page-lead">{live ? c.leadLive : c.lead}</p>
            </div>
          </header>

          <div className="plan-grid">
            <section className="card card-pad">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="plan-price">{c.price}</div>
                  <div className="mt-1.5 text-sm text-muted">{c.perMonth}</div>
                </div>
                <StatusPill snap={snap} lang={lang} />
              </div>
              <p className="mt-3 text-xs text-subtle">{c.gst}</p>

              {snap.status === "trial" && snap.trialStarted ? (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted">{c.trialOn}</span>
                    <span className="tabular-nums">
                      {snap.daysLeft} {c.trialDays}
                    </span>
                  </div>
                  <div
                    className="meter mt-2"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={30}
                    aria-valuenow={Math.max(0, 30 - (snap.daysLeft ?? 30))}
                  >
                    <span style={{ width: `${Math.min(100, Math.max(4, ((30 - (snap.daysLeft ?? 30)) / 30) * 100))}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-subtle tabular-nums">{formatDay(snap.trialEndsAt)}</p>
                </div>
              ) : snap.status === "trial" ? (
                <p className="mt-6 text-sm text-muted">{c.trialIdle}</p>
              ) : (
                <dl className="mt-6 text-sm">
                  <dt className="label-sm">{c.accessUntil}</dt>
                  <dd className="mt-1.5 tabular-nums">{formatDay(snap.periodEnd)}</dd>
                </dl>
              )}

              <div className="mt-7 flex flex-col gap-3 border-t border-border pt-6">
                {snap.status === "active" ? (
                  <Button variant="outline" onClick={() => void cancel()} disabled={busy}>
                    {c.cancelPlan}
                  </Button>
                ) : snap.status === "cancelled" && snap.canUseAi ? null : (
                  <Button size="lg" onClick={() => void subscribe()} disabled={busy}>
                    {busy ? c.subscribing : c.subscribe}
                  </Button>
                )}
                <p className="text-xs leading-relaxed text-subtle">
                  {snap.status === "cancelled" && snap.canUseAi
                    ? c.leftoverHint
                    : live
                      ? c.confirmHintLive
                      : c.confirmHint}
                </p>
              </div>
            </section>

            <section className="card card-pad">
              <h2 className="section-title">{c.includes}</h2>
              <ul className="check-list mt-4 space-y-3.5">
                {[c.itemTrial, c.itemResearch, c.itemChamber, c.itemOrders].map((item) => (
                  <li key={item}>
                    <Check className="size-4" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

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
    <span className={snap.status === "active" ? "chip !bg-accent-soft !text-accent" : "chip"}>{label}</span>
  );
}
