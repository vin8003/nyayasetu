/**
 * Back-compat RPC names. CNR fetch dispatches through the court-providers adapter.
 */
import {
  courtProviderStatus,
  fetchCnrToInbox as dispatchFetchCnrToInbox,
} from "../court-providers/store";

export const eciPartnerConfigured = courtProviderStatus;
export const fetchCnrToInbox = dispatchFetchCnrToInbox;
