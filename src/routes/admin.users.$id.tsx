import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  getAdminUser,
  updateAdminPlan,
  type AdminPlanAction,
  type AdminUserRow,
} from "@/lib/admin/store";

export const Route = createFileRoute("/admin/users/$id")({ component: AdminUserPage });

function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function AdminUserPage() {
  const { id } = Route.useParams();
  const [row, setRow] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AdminPlanAction | null>(null);

  useEffect(() => {
    getAdminUser({ data: { userId: id } })
      .then(setRow)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load user"));
  }, [id]);

  async function act(action: AdminPlanAction) {
    setBusy(action);
    setError(null);
    try {
      const next = await updateAdminPlan({ data: { userId: id, action } });
      setRow(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (error && !row) return <p className="text-sm text-danger">{error}</p>;
  if (!row) return <div className="skeleton h-40" />;

  return (
    <div>
      <p className="mb-4">
        <Link to="/admin/users" className="link-quiet text-sm">
          ← Users
        </Link>
      </p>
      <h1 className="page-title">{row.name || row.email}</h1>
      <p className="page-lead">{row.email}</p>
      <div className="card card-pad mt-8">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Plan</dt>
            <dd className="mt-1.5">{row.snap.status}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Access until</dt>
            <dd className="mt-1.5 tabular-nums">{formatDay(row.snap.periodEnd ?? row.snap.trialEndsAt)}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Days left</dt>
            <dd className="mt-1.5 tabular-nums">{row.snap.daysLeft}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Razorpay</dt>
            <dd className="mt-1.5 break-all">{row.razorpayId ?? "None — dummy or trial"}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Joined</dt>
            <dd className="mt-1.5 tabular-nums">{formatDay(row.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Matters</dt>
            <dd className="mt-1.5 tabular-nums">{row.matters ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Memos</dt>
            <dd className="mt-1.5 tabular-nums">{row.memos ?? "—"}</dd>
          </div>
        </dl>
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button disabled={!!busy} onClick={() => void act("grant30")}>
            {busy === "grant30" ? "Saving…" : "Grant 30 days"}
          </Button>
          <Button variant="outline" disabled={!!busy} onClick={() => void act("cancel")}>
            Cancel (keep leftover)
          </Button>
          <Button variant="outline" disabled={!!busy} onClick={() => void act("trial")}>
            Reset to trial
          </Button>
          <Button variant="danger" disabled={!!busy} onClick={() => void act("expire")}>
            End access now
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">
          Grant adds 30 days from the current end date. It does not charge Razorpay.
        </p>
      </div>
    </div>
  );
}
