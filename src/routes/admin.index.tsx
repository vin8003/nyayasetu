import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { getAdminStats, type AdminStats } from "@/lib/admin/store";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-hairline">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function AdminHome() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load stats"));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!stats) return <div className="skeleton h-40" />;

  return (
    <div>
      <p className="eyebrow">Chamber</p>
      <h1 className="page-title">Desk stats</h1>
      <p className="page-lead">
        Payments {stats.paymentsLive ? "are connected." : "are not connected on this build."}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Users" value={stats.users} hint={`${stats.users7d} in 7 days · ${stats.users30d} in 30`} />
        <Card label="Active" value={stats.active} hint="Paid window still open" />
        <Card label="Trial" value={stats.trial} />
        <Card label="Cancelled" value={stats.cancelled} hint="Leftover days still count" />
        <Card label="Expired" value={stats.expired} />
        <Card label="Paid vs dummy" value={`${stats.paid} / ${stats.dummy}`} hint="Razorpay id vs preview grant" />
        <Card label="Matters" value={stats.matters} />
        <Card label="Memos" value={stats.memos} />
      </div>
      <p className="mt-8 flex flex-wrap gap-4">
        <Link to="/admin/users" className="link-accent text-sm">
          Manage users →
        </Link>
        <Link to="/admin/providers" className="link-accent text-sm">
          Court data provider →
        </Link>
      </p>
    </div>
  );
}
