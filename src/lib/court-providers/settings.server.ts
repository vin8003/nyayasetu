import { getSql } from "@/lib/db";
import { getAdapter, listAdapterStatus } from "./registry.ts";
import {
  DEFAULT_COURT_PROVIDER_ID,
  SETTINGS_KEY_PROVIDER,
  parseProviderId,
  type CourtProviderId,
  type CourtProviderStatus,
} from "./types.ts";

export async function readActiveProviderId(): Promise<CourtProviderId> {
  try {
    const sql = await getSql();
    const rows = await sql<{ value: string }>`
      select value from app_settings where key = ${SETTINGS_KEY_PROVIDER} limit 1
    `;
    return parseProviderId(rows[0]?.value);
  } catch {
    return DEFAULT_COURT_PROVIDER_ID;
  }
}

export async function writeActiveProviderId(id: CourtProviderId, adminId: string): Promise<CourtProviderId> {
  const next = parseProviderId(id);
  const adapter = getAdapter(next);
  if (!adapter.selectable) return readActiveProviderId();
  const sql = await getSql();
  await sql`
    insert into app_settings (key, value, updated_at, updated_by)
    values (${SETTINGS_KEY_PROVIDER}, ${next}, now(), ${adminId})
    on conflict (key) do update set
      value = excluded.value,
      updated_at = now(),
      updated_by = excluded.updated_by
  `;
  return next;
}

export async function publicProviderStatus(): Promise<{
  configured: boolean;
  providerId: CourtProviderId;
  providerName: string;
}> {
  const id = await readActiveProviderId();
  const adapter = getAdapter(id);
  const configured = adapter.id !== "none" && adapter.isConfigured();
  return { configured, providerId: adapter.id, providerName: adapter.name };
}

export async function adminProviderStatus(): Promise<{
  activeId: CourtProviderId;
  providers: CourtProviderStatus[];
}> {
  const activeId = await readActiveProviderId();
  return { activeId, providers: listAdapterStatus(activeId) };
}

export async function dispatchFetchCnr(input: {
  userId: string;
  matterId?: string;
  cnr?: string;
  refresh?: boolean;
}) {
  const adapter = getAdapter(await readActiveProviderId());
  return adapter.fetchCnr(input);
}
