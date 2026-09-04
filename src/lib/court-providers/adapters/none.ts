import type { CourtDataAdapter } from "../types.ts";

export const noneAdapter: CourtDataAdapter = {
  id: "none",
  name: "Off",
  nameHi: "बंद",
  summary: "CNR fetch is disabled for every chamber. Demo reconstruction still works.",
  selectable: true,
  sourceKind: "none",
  isConfigured() {
    return true;
  },
  async fetchCnr() {
    return {
      ok: false,
      error: "PROVIDER_DISABLED",
      status: "fetch_error",
      message: "Court data fetch is turned off.",
    };
  },
};
