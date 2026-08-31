import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CiteMark } from "@/components/cite-mark";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";
import { ADMIN_SIGNIN_ERROR, adminSignIn } from "@/lib/admin/signin";
import { authClient } from "@/lib/auth/client";

function stashToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("grok-auth.bearer-token", token);
  } catch {
    /* ignore */
  }
}

export function AdminLoginForm({
  onIn,
}: {
  onIn?: (email: string) => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminSignIn({
        data: { email: email.trim(), password },
      });
      if (!result.ok || !result.token) {
        setError(result.ok ? ADMIN_SIGNIN_ERROR : result.error);
        return;
      }
      stashToken(result.token);
      try {
        await authClient.getSession();
      } catch {
        /* cookie / bearer will settle on next load */
      }
      if (onIn) onIn(result.email);
      else navigate({ to: "/admin" });
    } catch {
      setError(ADMIN_SIGNIN_ERROR);
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
          Email and password. This page does not create accounts.
        </p>
        <form className="card card-pad mt-8 flex flex-col gap-4" onSubmit={onSubmit} autoComplete="on">
          <Field>
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </Field>
          <Field>
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              required
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
