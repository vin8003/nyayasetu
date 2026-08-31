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
        <ul className="mt-6 divide-y divide-border">
          {rows.length === 0 ? (
            <li className="py-6 text-sm text-muted">No users match.</li>
          ) : (
            rows.map((row) => (
              <li key={row.id} className="py-4">
                <Link to="/admin/users/$id" params={{ id: row.id }} className="block">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{row.name || row.email}</p>
                    <p className="text-xs uppercase tracking-wide text-muted">{row.snap.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.email}</p>
                  <p className="mt-1 text-xs text-subtle">
                    Access {formatDay(row.snap.periodEnd ?? row.snap.trialEndsAt)}
                    {row.razorpayId ? " · paid" : row.snap.status === "active" ? " · dummy" : ""}
                  </p>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
