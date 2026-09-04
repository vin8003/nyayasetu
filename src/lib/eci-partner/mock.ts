/** Test-only Partner API mock. Never used in production. Never hits the live host. */

export const PARTNER_TEST_HOST = "https://webapi.ecourtsindia.com";

export type MockCall = { url: string; method: string; authorization: string };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function mockPartnerFetch(handler: (call: MockCall) => Response | Promise<Response>) {
  const calls: MockCall[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    const href = String(url);
    if (/ecourts\.gov\.in/i.test(href)) {
      throw new Error(`test mock refused official eCourts URL: ${href}`);
    }
    if (!href.startsWith(`${PARTNER_TEST_HOST}/`)) {
      throw new Error(`test mock refused non-Partner URL: ${href}`);
    }
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: MockCall = {
      url: href,
      method: String(init?.method ?? "GET"),
      authorization: String(headers.Authorization ?? ""),
    };
    calls.push(call);
    return handler(call);
  };
  return { calls, fetchImpl };
}
