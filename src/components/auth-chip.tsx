import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
      <a href="/login" className="link-accent inline-flex h-10 items-center px-2 text-sm">
        {c.signIn}
      </a>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-1">
      <span className="hidden max-w-[7.5rem] truncate text-xs text-muted lg:inline">{label}</span>
      <Link
        to="/billing"
        className="link-quiet hidden h-10 items-center px-2 text-xs sm:inline-flex"
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
        className="link-quiet h-10 px-2 text-xs disabled:opacity-50"
      >
        {signingOut ? c.signingOut : c.signOut}
      </button>
    </div>
  );
}
