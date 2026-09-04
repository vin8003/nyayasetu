/**
 * Court-data provider RPCs.
 * Adapters and API keys stay behind dynamic import so they never ship to the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { FetchCnrResult } from "@/lib/eci-partner/types";
import { COURT_PROVIDER_IDS, type CourtProviderId, type CourtProviderStatus } from "./types";

function countsAsLiveFetch(result: FetchCnrResult): boolean {
  if (result.ok) return true;
  return result.error === "EMPTY_PARSE" || result.error === "HTTP";
}

export const courtProviderStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { publicProviderStatus } = await import("./settings.server");
    return publicProviderStatus();
  });

export const fetchCnrToInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        matterId: z.string().min(1).max(80).optional(),
        cnr: z.string().max(40).optional(),
        refresh: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<FetchCnrResult> => {
    const { gateLiveCnrFetch, recordLiveCnrFetch } = await import("@/lib/billing/settings.server");
    const gate = await gateLiveCnrFetch(context.userId);
    if (!gate.ok) {
      return {
        ok: false,
        error: "TRIAL_LIMIT",
        status: "fetch_error",
        code: "TRIAL_LIMIT",
        message: gate.message,
      };
    }
    const { dispatchFetchCnr } = await import("./settings.server");
    const result = await dispatchFetchCnr({ userId: context.userId, ...data });
    if (countsAsLiveFetch(result)) {
      await recordLiveCnrFetch(context.userId);
    }
    return result;
  });

export const listCourtProviders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ activeId: CourtProviderId; providers: CourtProviderStatus[] }> => {
    const { requireAdmin } = await import("@/lib/admin/guard.server");
    await requireAdmin(context.userId);
    const { adminProviderStatus } = await import("./settings.server");
    return adminProviderStatus();
  });

export const setActiveCourtProvider = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.enum(COURT_PROVIDER_IDS),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<{ activeId: CourtProviderId; providers: CourtProviderStatus[] }> => {
    const { requireAdmin } = await import("@/lib/admin/guard.server");
    const admin = await requireAdmin(context.userId);
    const { writeActiveProviderId, adminProviderStatus } = await import("./settings.server");
    await writeActiveProviderId(data.id, admin.id);
    return adminProviderStatus();
  });
