import { useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { OutputLang } from "@/lib/research/types";
import { t } from "@/lib/research/copy";

export function AuthChip({ lang }: { lang: OutputLang }) {
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);
  const c = t(lang);

  if (isPending) {
    return <div className="h-8 w-16 animate-pulse rounded-md bg-elevated" />;
  }
  if (!user) {
    return (
      <a href="/login" className="inline-flex h-10 items-center px-2.5 text-sm text-muted hover:text-fg">
        {c.signIn}
      </a>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[7.5rem] truncate text-xs text-muted">{label}</span>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut().catch(() => setSigningOut(false));
        }}
        className="h-10 px-2 text-xs text-muted hover:text-fg disabled:opacity-50"
      >
        {signingOut ? c.signingOut : c.signOut}
      </button>
    </div>
  );
}
