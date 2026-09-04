/**
 * Court-data provider RPCs.
 * Adapters and API keys stay behind dynamic import so they never ship to the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { FetchCnrResult } from "@/lib/eci-partner/types";
import { COURT_PROVIDER_IDS, type CourtProviderId, type CourtProviderStatus } from "./types";

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
    const { dispatchFetchCnr } = await import("./settings.server");
    return dispatchFetchCnr({ userId: context.userId, ...data });
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
