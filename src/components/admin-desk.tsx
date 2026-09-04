import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CiteMark } from "@/components/cite-mark";
import { AdminProvidersPane } from "@/components/admin-providers";
import { AdminTrialSettings } from "@/components/admin-trial-settings";
import { AdminUserLimits } from "@/components/admin-user-limits";
import { Button } from "@/components/ui/button";
import { Field, Hint, Input, Label } from "@/components/ui/field";
import {
  adminSession,
  deleteAdminUser,
  getAdminStats,
  getAdminUser,
  listAdminUsers,
  updateAdminPlan,
  type AdminPlanAction,
  type AdminStats,
  type AdminUserRow,
} from "@/lib/admin/store";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { chambersAuth } from "@/lib/seed-user";

type View = "stats" | "users" | "providers" | { user: string };

function stashToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

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

export function AdminDesk() {
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setChecking(false);
      setEmail(null);
      return;
    }
    adminSession()
      .then((s) => {
        setEmail(s.email);
        setBlocked(false);
      })
      .catch((err) => {
        const msg = String(err?.message ?? err);
        if (!/unauthorized/i.test(msg)) setBlocked(true);
        setEmail(null);
      })
      .finally(() => setChecking(false));
  }, [isPending, user]);

  if (isPending || checking) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <div className="skeleton h-10 w-48" />
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
        <div className="max-w-sm text-center">
          <p className="font-display text-2xl">Desk only.</p>
          <p className="mt-3 text-sm text-muted">This login is not on the admin list.</p>
          <Link to="/" className="link-accent mt-6 inline-block text-sm">
            Back to CiteBench
          </Link>
        </div>
      </main>
    );
  }

  if (!email) return <AdminDeskLogin onIn={(next) => setEmail(next)} />;
  return <AdminDeskApp email={email} />;
}

function AdminDeskLogin({ onIn }: { onIn: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError("Email and a password of at least 8 characters are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await chambersAuth({
        data: { username: email.trim(), password, mode: "in" },
      });
      if (!result.ok) throw new Error(result.error || "Sign in failed");
      if (!result.token) throw new Error("Sign in failed");
      stashToken(result.token);
      try {
        await authClient.getSession();
      } catch {
        /* bearer in sessionStorage */
      }
      const session = await adminSession();
      onIn(session.email);
    } catch (err) {
      await signOut().catch(() => undefined);
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="brand">
          <CiteMark className="size-8" />
          <span className="brand-word text-xl">CiteBench</span>
        </Link>
        <h1 className="mt-8 font-display text-3xl font-medium tracking-tight">Admin</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in with an allowlisted account. There is no admin registration.
        </p>
        <form className="card card-pad mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <Field>
            <Label htmlFor="desk-email">Email</Label>
            <Input
              id="desk-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <Hint>Must match ADMIN_EMAILS in App Secrets.</Hint>
          </Field>
          <Field>
            <Label htmlFor="desk-password">Password</Label>
            <Input
              id="desk-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </Field>
          {error ? (
            <p className="rounded-md bg-danger/12 px-3.5 py-3 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? "Checking…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6">
          <Link to="/" className="link-quiet text-sm">
            ← Chamber
          </Link>
        </p>
      </div>
    </main>
  );
}

function AdminDeskApp({ email }: { email: string }) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("stats");

  return (
    <div className="shell min-h-dvh bg-bg text-fg">
      <header className="topbar">
        <div className="topbar-inner">
          <button type="button" className="brand" onClick={() => setView("stats")}>
            <CiteMark className="size-7" />
            <span className="brand-word">Admin</span>
          </button>
          <nav className="flex items-center gap-1 text-sm">
            <button
              type="button"
              className={`link-quiet px-2 py-1 ${view === "stats" ? "text-accent" : ""}`}
              onClick={() => setView("stats")}
            >
              Stats
            </button>
            <button
              type="button"
              className={`link-quiet px-2 py-1 ${view === "users" || typeof view === "object" ? "text-accent" : ""}`}
              onClick={() => setView("users")}
            >
              Users
            </button>
            <button
              type="button"
              className={`link-quiet px-2 py-1 ${view === "providers" ? "text-accent" : ""}`}
              onClick={() => setView("providers")}
            >
              Providers
            </button>
          </nav>
          <div className="topbar-actions text-xs text-muted">
            <span className="hidden max-w-[10rem] truncate sm:inline">{email}</span>
            <button
              type="button"
              className="link-quiet px-2 py-1"
              onClick={() => void signOut().then(() => navigate({ to: "/login", search: { desk: "1" } }))}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {view === "stats" ? <AdminStatsPane /> : null}
        {view === "users" ? <AdminUsersPane onOpen={(id) => setView({ user: id })} /> : null}
        {view === "providers" ? <AdminProvidersPane /> : null}
        {typeof view === "object" ? (
          <AdminUserPane id={view.user} onBack={() => setView("users")} />
        ) : null}
      </main>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg bg-surface p-4 shadow-hairline">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function AdminStatsPane() {
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
      <AdminTrialSettings />
    </div>
  );
}

function AdminUsersPane({ onOpen }: { onOpen: (id: string) => void }) {
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

  return (
    <div>
      <p className="eyebrow">Chamber</p>
      <h1 className="page-title">Users</h1>
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="flex-1" />
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
                <button type="button" className="block w-full text-left" onClick={() => onOpen(row.id)}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{row.name || row.email}</p>
                    <p className="text-xs uppercase tracking-wide text-muted">{row.snap.status}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">{row.email}</p>
                  <p className="mt-1 text-xs text-subtle">
                    Access {formatDay(row.snap.periodEnd ?? row.snap.trialEndsAt)}
                    {row.razorpayId ? " · paid" : row.snap.status === "active" ? " · dummy" : ""}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function AdminUserPane({ id, onBack }: { id: string; onBack: () => void }) {
  const [row, setRow] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<AdminPlanAction | "delete" | null>(null);

  useEffect(() => {
    getAdminUser({ data: { userId: id } })
      .then(setRow)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load user"));
  }, [id]);

  async function act(action: AdminPlanAction) {
    setBusy(action);
    setError(null);
    try {
      setRow(await updateAdminPlan({ data: { userId: id, action } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "This cannot be undone. Every matter, memo, plan, and login for this user will be deleted. Continue?",
      )
    ) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      await deleteAdminUser({ data: { userId: id } });
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
      setBusy(null);
    }
  }

  if (error && !row) return <p className="text-sm text-danger">{error}</p>;
  if (!row) return <div className="skeleton h-40" />;

  return (
    <div>
      <p className="mb-4">
        <button type="button" className="link-quiet text-sm" onClick={onBack}>
          ← Users
        </button>
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
            <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Live CNR fetches</dt>
            <dd className="mt-1.5 tabular-nums">
              {row.snap.cnrFetchesUsed} / {row.snap.cnrFetchLimit}
              {row.snap.cnrFetchesLeft == null ? " · unlimited" : ""}
            </dd>
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
      <AdminUserLimits row={row} onSaved={setRow} />
      <div className="card card-pad mt-6">
        <h2 className="font-display text-lg font-medium">Delete account</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Removes this user's matters, memos, plan, and login. They can register again with the same
          email. Chamber users cannot do this themselves.
        </p>
        <div className="mt-5">
          <Button variant="danger" disabled={!!busy} onClick={() => void remove()}>
            {busy === "delete" ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

