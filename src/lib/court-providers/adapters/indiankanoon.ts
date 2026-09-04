import { isIkConfigured } from "../../indiankanoon/key.ts";
import { IK_SOURCE_KIND } from "../../indiankanoon/types.ts";
import type { CourtDataAdapter, FetchCnrInput } from "../types.ts";

export const indianKanoonAdapter: CourtDataAdapter = {
  id: "indiankanoon",
  name: "Indian Kanoon",
  nameHi: "इंडियन कानून",
  summary: "Search + document by CNR on api.indiankanoon.org. Token auth. Orders land unconfirmed in Inbox.",
  selectable: true,
  sourceKind: IK_SOURCE_KIND,
  isConfigured() {
    return isIkConfigured();
  },
  async fetchCnr(input: FetchCnrInput) {
    const { fetchIkCnrToInbox } = await import("../../indiankanoon/fetch.server.ts");
    return fetchIkCnrToInbox(input.userId, input);
  },
};
