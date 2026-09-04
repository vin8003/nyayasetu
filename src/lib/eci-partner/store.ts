/**
 * Back-compat RPC names. CNR fetch dispatches through the court-providers adapter.
 */
export {
  courtProviderStatus as eciPartnerConfigured,
  fetchCnrToInbox,
} from "../court-providers/store";
