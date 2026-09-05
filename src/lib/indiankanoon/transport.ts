/**
 * Live Indian Kanoon HTTP.
 * Host is Cloudflare + IPv4-only. Vercel fetch and Node sockets from US
 * datacenter IPs often get ECONNRESET during TLS. Pin IPv4, talk HTTP/1.1,
 * connect by A-record with SNI, and send a browser UA (curl-equivalent).
 * Tests pass fetchImpl and never import this for live calls.
 */
import dns from "node:dns";
import https from "node:https";

const TIMEOUT_MS = 15000;
const IK_HOST = "api.indiankanoon.org";
const FALLBACK_IPS = ["104.26.11.5", "104.26.10.5", "172.67.68.29"];
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* Node without the helper — lookup still forces v4 below */
}

function headerMap(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {};
  const raw = init?.headers;
  if (!raw) return headers;
  if (raw instanceof Headers) {
    raw.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }
  if (Array.isArray(raw)) {
    for (const [key, value] of raw) headers[key] = value;
    return headers;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (value != null) headers[key] = String(value);
  }
  return headers;
}

function errorCode(err: unknown): string {
  let current: unknown = err;
  for (let i = 0; i < 4 && current && typeof current === "object"; i += 1) {
    const rec = current as { code?: unknown; cause?: unknown; message?: unknown };
    if (typeof rec.code === "string" && rec.code) return rec.code;
    if (typeof rec.message === "string") {
      const m = rec.message.match(/\b(E[A-Z0-9]{3,}|UND_[A-Z0-9_]+)\b/);
      if (m) return m[1] ?? "";
    }
    current = rec.cause;
  }
  return "";
}

function ipv4Lookup(
  hostname: string,
  _options: unknown,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
) {
  dns.lookup(hostname, { family: 4, all: false }, callback);
}

type Target = { hostname: string; servername: string };

function once(input: string, init: RequestInit | undefined, target: Target): Promise<Response> {
  const url = new URL(input);
  const method = String(init?.method ?? "GET").toUpperCase();
  const body = typeof init?.body === "string" ? init.body : undefined;
  const headers = headerMap(init);
  headers.Host = IK_HOST;
  headers["User-Agent"] = headers["User-Agent"] || UA;
  headers.Connection = "close";
  headers.Accept = headers.Accept || "application/json";
  if (body && !headers["Content-Length"] && !headers["content-length"]) {
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: target.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        servername: target.servername,
        lookup: ipv4Lookup,
        minVersion: "TLSv1.2",
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const out = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") out.set(key, value);
            else if (Array.isArray(value)) out.set(key, value.join(", "));
          }
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 0, headers: out }));
        });
      },
    );
    req.on("error", (err) => reject(err));
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      const abort = new Error("abort");
      abort.name = "AbortError";
      reject(abort);
    });
    if (body) req.write(body);
    req.end();
  });
}

async function v4Addresses(): Promise<string[]> {
  try {
    const { resolve4 } = await import("node:dns/promises");
    const ips = await Promise.race([
      resolve4(IK_HOST),
      new Promise<string[]>((_, reject) => {
        setTimeout(() => reject(new Error("dns timeout")), 2500);
      }),
    ]);
    if (ips.length) return ips;
  } catch {
    /* fall through */
  }
  return FALLBACK_IPS;
}

function pause(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function nodeHttpsFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.hostname !== IK_HOST) {
    return Promise.reject(new Error("CiteBench only opens api.indiankanoon.org over HTTPS."));
  }

  const targets: Target[] = [{ hostname: IK_HOST, servername: IK_HOST }];
  for (const ip of await v4Addresses()) {
    targets.push({ hostname: ip, servername: IK_HOST });
  }

  let last: unknown;
  for (let round = 0; round < 2; round += 1) {
    if (round > 0) await pause(400);
    for (const target of targets) {
      try {
        return await once(input, init, target);
      } catch (err) {
        last = err;
      }
    }
  }

  try {
    const headers = headerMap(init);
    headers["User-Agent"] = headers["User-Agent"] || UA;
    headers.Accept = headers.Accept || "application/json";
    return await fetch(input, { ...init, headers, redirect: "follow" });
  } catch (err) {
    const code = errorCode(last) || errorCode(err) || "ECONNRESET";
    const wrapped = new Error(`fetch failed ${code}`);
    (wrapped as Error & { cause: unknown }).cause = last ?? err;
    throw wrapped;
  }
}
