import { ecourtsIndiaAdapter } from "./adapters/ecourtsindia.ts";
import { indianKanoonAdapter } from "./adapters/indiankanoon.ts";
import { noneAdapter } from "./adapters/none.ts";
import {
  DEFAULT_COURT_PROVIDER_ID,
  parseProviderId,
  type CourtDataAdapter,
  type CourtProviderId,
  type CourtProviderStatus,
} from "./types.ts";

/**
 * Court-data adapters. Add a file under adapters/ and append it here.
 * Admin picks one globally; fetch always goes through getActiveAdapter.
 */
export const COURT_ADAPTERS: CourtDataAdapter[] = [ecourtsIndiaAdapter, indianKanoonAdapter, noneAdapter];

export function getAdapter(id: string): CourtDataAdapter {
  const parsed = parseProviderId(id);
  return COURT_ADAPTERS.find((row) => row.id === parsed) ?? noneAdapter;
}

export function listAdapterStatus(activeId: CourtProviderId): CourtProviderStatus[] {
  const active = parseProviderId(activeId);
  return COURT_ADAPTERS.map((row) => ({
    id: row.id,
    name: row.name,
    nameHi: row.nameHi,
    summary: row.summary,
    selectable: row.selectable,
    configured: row.isConfigured(),
    active: row.id === active,
  }));
}

export function defaultAdapter(): CourtDataAdapter {
  return getAdapter(DEFAULT_COURT_PROVIDER_ID);
}
