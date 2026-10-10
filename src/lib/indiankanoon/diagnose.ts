/**
 * Indian Kanoon connection diagnosis: the pure part (step shapes + verdict).
 * The live runner is diagnose.server.ts. Reports never carry the token or headers.
 */
import type { IkAttempt } from "./types.ts";

export type DiagStep = {
  name: "runtime" | "egress" | "dns" | "reach" | "search";
  ok: boolean;
  ms: number;
  detail: string;
  status?: number;
  code?: string;
  attempts?: IkAttempt[];
};

export type IkDiagnosis = {
  cnr: string;
  at: string;
  steps: DiagStep[];
  verdict: string;
};

function step(steps: DiagStep[], name: DiagStep["name"]): DiagStep | undefined {
  return steps.find((s) => s.name === name);
}

/** One plain sentence on what the steps show, for the admin and for the hosting logs. */
export function summariseDiagnosis(steps: DiagStep[]): string {
  const egress = step(steps, "egress");
  const where = egress?.ok ? ` (server egress: ${egress.detail})` : "";
  const reach = step(steps, "reach");
  const search = step(steps, "search");

  if (reach && !reach.ok) {
    return `This server cannot open a connection to api.indiankanoon.org${where}: ${reach.code || reach.detail}. Not a token problem — the request is dropped before Indian Kanoon sees it. Run from an Indian region or route through a relay.`;
  }
  if (!search) return `Indian Kanoon is reachable${where}; the authenticated search was not run.`;
  if (search.code === "NO_TOKEN") return `Indian Kanoon is reachable${where}, but IKANOON_API_TOKEN is not set on this server.`;
  if (search.ok) return `Live fetch works from this server${where}. ${search.detail}`;
  if (search.status === 401 || search.status === 403) {
    return `Indian Kanoon is reachable${where} but rejected IKANOON_API_TOKEN.`;
  }
  if (search.status === 429) return `Indian Kanoon is reachable${where} but rate-limited this token.`;
  if (!search.status) {
    return `Indian Kanoon answers without a token but the authenticated call failed on the network${where}: ${search.code || search.detail}. Likely a WAF/IP block on authenticated traffic from this egress.`;
  }
  return `Indian Kanoon is reachable${where}; the search failed: ${search.detail}`;
}
