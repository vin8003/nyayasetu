import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/billing")({ component: BillingPage });

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
    <AppShell lang={lang} onLang={onLang} active="today">
      {isPending ? <div className="skeleton h-40" /> : null}
      {!isPending && !user ? <GuestPanel lang={lang} /> : null}
      {!isPending && user && snap ? (
        <div className="stagger-in mx-auto max-w-2xl">
          <p className="eyebrow">{c.kicker}</p>
          <h1 className="page-title">{c.title}</h1>
          <p className="page-lead">{live ? c.leadLive : c.lead}</p>

          <div className="paper mt-8 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-display text-4xl font-medium tracking-tight tabular-nums">{c.price}</div>
                <div className="mt-1 text-sm text-paper-muted">{c.perMonth}</div>
              </div>
              <StatusPill snap={snap} lang={lang} />
            </div>
            <p className="mt-4 text-xs text-paper-muted">{c.gst}</p>
            <dl className="mt-7 grid gap-4 border-t border-paper-line pt-6 text-sm sm:grid-cols-2">
              {snap.status === "trial" ? (
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-paper-muted">{c.trialOn}</dt>
                  <dd className="mt-1.5 tabular-nums">
                    {snap.trialStarted
                      ? `${formatDay(snap.trialEndsAt)} · ${snap.daysLeft} ${c.trialDays}`
                      : c.trialIdle}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-paper-muted">{c.accessUntil}</dt>
                  <dd className="mt-1.5 tabular-nums">{formatDay(snap.periodEnd)}</dd>
                </div>
              )}
            </dl>
            <h2 className="mt-8 font-display text-lg font-medium">{c.includes}</h2>
            <ul className="mt-3 space-y-2.5 text-sm">
              {[c.itemTrial, c.itemResearch, c.itemChamber, c.itemOrders].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 h-px w-3 shrink-0 bg-paper-muted" aria-hidden />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 border-t border-paper-line pt-6">
              {snap.status === "active" ? (
                <Button variant="paper" onClick={() => void cancel()} disabled={busy}>
                  {c.cancelPlan}
                </Button>
              ) : snap.status === "cancelled" && snap.canUseAi ? null : (
                <Button variant="paper" size="lg" onClick={() => void subscribe()} disabled={busy}>
                  {busy ? c.subscribing : c.subscribe}
                </Button>
              )}
              <p className="text-xs leading-relaxed text-paper-muted">
                {snap.status === "cancelled" && snap.canUseAi
                  ? c.leftoverHint
                  : live
                    ? c.confirmHintLive
                    : c.confirmHint}
              </p>
            </div>
          </div>
          <p className="mt-8">
            <Link to="/" className="link-quiet text-sm">
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
    <div className="rounded-full bg-paper-ink/6 px-3 py-1 text-xs font-medium shadow-[0_0_0_1px_rgb(0_0_0/0.1)]">
      {label}
    </div>
  );
}
