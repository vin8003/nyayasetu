/**
 * Live Indian Kanoon connection test for Admin → Court data.
 * Cost: one unauthenticated probe (free, 401 expected), then ONE authenticated search
 * and at most ONE document fetch — both billed by Indian Kanoon. Nothing is saved.
 */
import { fetchIkCase } from "./client.ts";
import { summariseDiagnosis, type DiagStep, type IkDiagnosis } from "./diagnose.ts";
import { nodeHttpsFetch } from "./transport.ts";
import type { IkAttempt } from "./types.ts";

const HOSTING_ENV = /^(GROK_|VERCEL|AWS_REGION|FLY_|RENDER|RAILWAY_|K_SERVICE|NETLIFY)/;

function runtimeStep(): DiagStep {
  const names = Object.keys(process.env)
    .filter((key) => HOSTING_ENV.test(key))
    .sort();
  const region = process.env.VERCEL_REGION || process.env.AWS_REGION || "unknown";
  return {
    name: "runtime",
    ok: true,
    ms: 0,
    detail: `region ${region}; node ${process.version}; hosting env: ${names.join(", ") || "none"}`,
  };
}

async function egressStep(): Promise<DiagStep> {
  const started = Date.now();
  for (const url of ["https://ipinfo.io/json", "https://api.ipify.org?format=json"]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const body = (await res.json()) as { ip?: string; country?: string; region?: string; org?: string };
      const place = [body.country, body.region, body.org].filter(Boolean).join(", ");
      return { name: "egress", ok: true, ms: Date.now() - started, detail: `${body.ip ?? "?"}${place ? ` (${place})` : ""}` };
    } catch {
      /* try the next lookup */
    }
  }
  return { name: "egress", ok: false, ms: Date.now() - started, detail: "could not look up the outbound IP" };
}

async function dnsStep(): Promise<DiagStep> {
  const started = Date.now();
  try {
    const { resolve4 } = await import("node:dns/promises");
    const ips = await resolve4("api.indiankanoon.org");
    return { name: "dns", ok: ips.length > 0, ms: Date.now() - started, detail: ips.join(", ") || "no A records" };
  } catch (err) {
    return { name: "dns", ok: false, ms: Date.now() - started, detail: "lookup failed", code: (err as { code?: string }).code };
  }
}

/** No token: a 401 proves TCP + TLS + HTTP all work from this server, at no cost. */
async function reachStep(): Promise<DiagStep> {
  const started = Date.now();
  const attempts: IkAttempt[] = [];
  try {
    const res = await nodeHttpsFetch(
      "https://api.indiankanoon.org/search/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "formInput=diagnose&pagenum=0",
      },
      attempts,
    );
    return { name: "reach", ok: true, ms: Date.now() - started, status: res.status, detail: `HTTP ${res.status} without a token`, attempts };
  } catch (err) {
    return {
      name: "reach",
      ok: false,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : "network error",
      code: firstCode(attempts),
      attempts,
    };
  }
}

async function searchStep(cnr: string, token: string): Promise<DiagStep> {
  const started = Date.now();
  const attempts: IkAttempt[] = [];
  const result = await fetchIkCase({ cnr, token, trace: attempts, maxDocs: 1 });
  const ms = Date.now() - started;
  if (result.ok) {
    const doc = result.docs[0];
    return {
      name: "search",
      ok: true,
      ms,
      status: 200,
      detail: `${result.hits.length} hit(s); first document ${doc ? `${doc.body.length} chars` : "not loaded"}`,
      attempts,
    };
  }
  return { name: "search", ok: false, ms, status: result.status, code: firstCode(attempts) ?? result.code, detail: result.message, attempts };
}

function firstCode(attempts: IkAttempt[]): string | undefined {
  return attempts.find((a) => a.code && a.via !== "fetch")?.code ?? attempts.find((a) => a.code)?.code;
}

export async function diagnoseIk(input: {
  cnr: string;
  token: string | null;
  tokenProblem?: { code: string; detail: string } | null;
}): Promise<IkDiagnosis> {
  const steps: DiagStep[] = [runtimeStep(), await egressStep(), await dnsStep()];
  const reach = await reachStep();
  steps.push(reach);
  // Spend a billed search only once the host is reachable at all.
  if (reach.ok && input.token) steps.push(await searchStep(input.cnr, input.token));
  if (!input.token) {
    steps.push({
      name: "search",
      ok: false,
      ms: 0,
      code: input.tokenProblem?.code ?? "NO_TOKEN",
      detail: input.tokenProblem?.detail ?? "IKANOON_API_TOKEN is not set on this server",
    });
  }
  const report: IkDiagnosis = { cnr: input.cnr, at: new Date().toISOString(), steps, verdict: summariseDiagnosis(steps) };
  console.info(`[ik] diagnose ${input.cnr}: ${report.verdict}`);
  return report;
}
