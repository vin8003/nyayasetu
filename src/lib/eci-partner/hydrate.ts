import type { NormalizedOrder } from "../court-import/types.ts";
import { fetchPartnerOrderMarkdown } from "./client.ts";
import { applyMarkdownToOrders, pendingOrderPdfs } from "./parse.ts";

const MAX_ORDER_MD = 8;

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

/** When case detail has PDF stubs but no markdownContent, GET order-md per file. */
export async function hydrateOrderMarkdown(input: {
  cnr: string;
  apiKey: string;
  orders: NormalizedOrder[];
  fetchImpl?: FetchImpl;
}): Promise<{ filled: number; attempted: number }> {
  const files = pendingOrderPdfs(input.orders).slice(0, MAX_ORDER_MD);
  let filled = 0;
  for (const file of files) {
    const got = await fetchPartnerOrderMarkdown({
      cnr: input.cnr,
      file,
      apiKey: input.apiKey,
      fetchImpl: input.fetchImpl,
    });
    if (!got.ok) continue;
    filled += applyMarkdownToOrders(input.orders, file, got.body);
  }
  return { filled, attempted: files.length };
}
