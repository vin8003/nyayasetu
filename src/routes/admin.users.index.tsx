import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { listAdminUsers, type AdminUserRow } from "@/lib/admin/store";

export const Route = createFileRoute("/admin/users/")({ component: AdminUsers });

function formatDay(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export function AdminUsers() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load(search = q) {
    setError(null);
    listAdminUsers({ data: { q: search } })
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load users"));
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    load(q);
  }

  return (
    <div>
      <p className="eyebrow">Chamber</p>
      <h1 className="page-title">Users</h1>
      <form className="mt-6 flex gap-2" onSubmit={onSearch}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or email"
          className="flex-1"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {!rows ? <div className="skeleton mt-6 h-40" /> : null}
      {rows ? (
        <div className="card mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Access until</th>
                <th className="hidden sm:table-cell">Billing</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted">
                    No users match.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link to="/admin/users/$id" params={{ id: row.id }} className="block">
                        <span className="font-medium">{row.name || row.email}</span>
                        <span className="block text-xs text-muted">{row.email}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium capitalize shadow-hairline">
                        {row.snap.status}
                      </span>
                    </td>
                    <td className="hidden tabular-nums sm:table-cell">
                      {formatDay(row.snap.periodEnd ?? row.snap.trialEndsAt)}
                    </td>
                    <td className="hidden text-muted sm:table-cell">
                      {row.razorpayId ? "Paid" : row.snap.status === "active" ? "Dummy" : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
