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
    <div className="flex items-center gap-0.5">
      <span className="hidden max-w-[7.5rem] truncate text-xs text-muted lg:inline">{label}</span>
      <Link
        to="/billing"
        className="link-quiet hidden h-9 items-center px-2 text-xs sm:inline-flex"
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
        className="link-quiet inline-flex size-11 items-center justify-center disabled:opacity-50 sm:h-9 sm:w-auto sm:px-2 sm:size-auto"
      >
        <LogOut className="size-4 sm:hidden" aria-hidden />
        <span className="hidden text-xs sm:inline">{signOutLabel}</span>
      </button>
    </div>
  );
}
