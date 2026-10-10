import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { b } from "@/lib/billing/copy";
import type { OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";

export function AuthChip({ lang }: { lang: OutputLang }) {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const c = t(lang);

  if (isPending) {
    return <div className="skeleton h-9 w-16" />;
  }
  if (!user) {
    return (
      <a href="/login" className="link-accent inline-flex h-9 items-center px-2 text-sm">
        {c.signIn}
      </a>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const signOutLabel = signingOut ? c.signingOut : c.signOut;
  return (
    <div className="auth-chip">
      <span className="auth-name">
        <span className="auth-avatar" aria-hidden>{label.trim().charAt(0).toUpperCase()}</span>
        <span className="min-w-0 truncate">{label}</span>
      </span>
      <Link
        to="/billing"
        className="link-quiet auth-link"
      >
        {b(lang).plan}
      </Link>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut().catch(() => setSigningOut(false));
        }}
        aria-label={signOutLabel}
        title={signOutLabel}
        className="link-quiet auth-link auth-out disabled:opacity-50"
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        <span className="auth-out-text">{signOutLabel}</span>
      </button>
    </div>
  );
}
