import { isEciConfigured } from "../../eci-partner/key.ts";
import { ECI_SOURCE_KIND } from "../../eci-partner/types.ts";
import type { CourtDataAdapter, FetchCnrInput } from "../types.ts";

export const ecourtsIndiaAdapter: CourtDataAdapter = {
  id: "eci_partner",
  name: "eCourtsIndia Partner API",
  nameHi: "eCourtsIndia पार्टनर API",
  summary: "GET /api/partner/case/{cnr}. Orders land unconfirmed in Inbox. Server-only Bearer key.",
  selectable: true,
  sourceKind: ECI_SOURCE_KIND,
  isConfigured() {
    return isEciConfigured();
  },
  async fetchCnr(input: FetchCnrInput) {
    const { fetchCnrToInboxImpl } = await import("../../eci-partner/fetch.server.ts");
    return fetchCnrToInboxImpl(input.userId, input);
  },
};
