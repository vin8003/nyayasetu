import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { readEntitlementCache, writeEntitlementCache } from "./cache";
import type { BillingSnapshot } from "./plan";
import { getEntitlement } from "./store";

/** The signed-in user's plan, painted from the short-lived cache and refreshed once per mount. */
export function useEntitlement(): BillingSnapshot | null {
  const { user } = useCurrentUserState();
  const [snap, setSnap] = useState<BillingSnapshot | null>(() => readEntitlementCache());

  useEffect(() => {
    if (!user) {
      setSnap(null);
      return;
    }
    let live = true;
    getEntitlement()
      .then((next) => {
        writeEntitlementCache(next);
        if (live) setSnap(next);
      })
      .catch(() => {
        if (live) setSnap(null);
      });
    return () => {
      live = false;
    };
  }, [user?.id]);

  return user ? snap : null;
}
