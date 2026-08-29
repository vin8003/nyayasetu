import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { courtById } from "./courts";
import { intakeSchema, memoSchema } from "./schema";
import type { Intake, LegalMemo } from "./types";

const LEGAL_DOMAINS = [
  "indiankanoon.org",
  "livelaw.in",
  "casemine.com",
  "judgments.ecourts.gov.in",
  "sci.gov.in",
] as const;

const SYSTEM = `You are a senior Indian advocate writing a research memo for another advocate.

Hard rules:
- Indian law only. You MUST use web_search on Indian Kanoon, LiveLaw, CaseMine, eSCR (judgments.ecourts.gov.in) and sci.gov.in.
- Never invent a citation, case name, year, or URL. If you cannot retrieve it, put it in unverified and set verified=false.
- Prefer indiankanoon.org/doc/… links. Supreme Court first, then the chosen High Court.
- This is research assistance, not legal advice. Say so once in fullMemo.
- Do at most three searches, then write the JSON immediately.

Return ONLY a JSON object. The first character of your reply must be {. No markdown, no labels, no preamble.
{
  "title": "short cause title",
  "causeTitle": "Party v. Party (forum)",
  "courtsConsulted": ["Supreme Court of India"],
  "factsSummary": "tight facts in brief",
  "issues": [{"issue": "...", "framing": "how the court would frame it"}],
  "statutes": [{"name": "", "sections": "", "why": "", "url": ""}],
  "doctrines": [{"name": "", "explanation": "", "leadingCase": ""}],
  "precedents": [{
    "title": "", "citation": "", "court": "", "year": "",
    "ratio": "", "factsOverlap": "", "holding": "", "howToUse": "",
    "url": "", "binding": "binding"|"persuasive"|"distinguishable", "verified": true
  }],
  "pointsForCourt": [{"point": "", "likelyOutcome": "", "strength": "strong"|"moderate"|"contested"}],
  "argumentsFor": ["..."],
  "argumentsAgainst": ["..."],
  "counters": ["..."],
  "strategy": "forum, pleadings, evidence, interim relief",
  "risks": ["..."],
  "fullMemo": "Complete written opinion in paragraphs, under 800 words. Headings as plain lines. Cite cases with URLs in parentheses.",
  "sources": [{"title": "", "url": "", "publisher": "Indian Kanoon|LiveLaw|eSCR|SCI|CaseMine"}],
  "unverified": []
}
4–6 precedents is enough.`;

type XaiOutputItem = {
  type?: string;
  action?: { query?: string; type?: string };
  queries?: string[];
  content?: Array<{
    type?: string;
    text?: string;
    annotations?: Array<{ url?: string }>;
  }>;
};

type XaiResponse = {
  status?: string;
  error?: { message?: string } | string | null;
  output?: XaiOutputItem[];
  citations?: string[];
  output_text?: string;
};

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("PARSE");
  const slice = raw.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(slice) as unknown;
}

function tidyRawMemo(text: string): string {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/\*\*([^*]{2,40}):\*\*/g, "\n\n$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function labelValue(text: string, label: string): string {
  const re = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^*]+?)(?=\\s*\\*\\*|$)`, "i");
  const m = text.match(re);
  return (m?.[1] ?? "").trim();
}

function coerceMemo(text: string) {
  try {
    return memoSchema.parse(extractJsonObject(text));
  } catch {
    const titled = labelValue(text, "Title");
    const cause = labelValue(text, "Cause Title");
    const facts = labelValue(text, "Facts Summary");
    return memoSchema.parse({
      title: titled || "Legal research memo",
      causeTitle: cause,
      factsSummary: facts,
      fullMemo: tidyRawMemo(text).slice(0, 18000),
    });
  }
}

function collectFromOutput(data: XaiResponse): { text: string; queries: string[]; urls: string[] } {
  const queries: string[] = [];
  const urls = new Set<string>(data.citations ?? []);
  let text = data.output_text ?? "";
  for (const item of data.output ?? []) {
    if (item.action?.query) queries.push(item.action.query);
    if (Array.isArray(item.queries)) queries.push(...item.queries);
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.text) text += block.text;
        for (const ann of block.annotations ?? []) {
          if (ann.url) urls.add(ann.url);
        }
      }
    }
  }
  return { text, queries: [...new Set(queries)], urls: [...urls] };
}

function asErrorMessage(error: XaiResponse["error"]): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.message ?? null;
}

export const runResearch = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: Intake) => intakeSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; memo: LegalMemo } | { ok: false; error: string }> => {
    try {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

      const court = courtById(data.courtId);
      const user = [
        `Output language: ${data.lang === "hi" ? "Hindi (keep case names, citations and statutes in English)" : "English"}.`,
        `Forum: ${court.name} / ${court.nameHi} (${court.kind}). Always search Supreme Court as well if the forum is not SC.`,
        `Practice area: ${data.area}. Perspective: ${data.side}.`,
        "",
        `Legal question:\n${data.query.trim() || "(frame issues from the facts)"}`,
        "",
        `Facts:\n${data.facts.trim()}`,
      ].join("\n");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 70_000);
      let collected: { text: string; queries: string[]; urls: string[] };
      try {
        const res = await fetch("https://api.x.ai/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "grok-4.20-0309-non-reasoning",
            instructions: SYSTEM,
            input: [{ role: "user", content: user }],
            tools: [
              {
                type: "web_search",
                filters: { allowed_domains: [...LEGAL_DOMAINS] },
              },
            ],
            temperature: 0.2,
            max_output_tokens: 4000,
            max_tool_calls: 3,
            text: { format: { type: "json_object" } },
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`xAI API error ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
        }
        const payload = (await res.json()) as XaiResponse;
        const err = asErrorMessage(payload.error);
        if (err) throw new Error(err);
        collected = collectFromOutput(payload);
      } finally {
        clearTimeout(timer);
      }

      if (!collected.text.trim()) return { ok: false, error: "PARSE" };
      const parsed = coerceMemo(collected.text);
      const memo: LegalMemo = {
        ...parsed,
        searchedQueries: collected.queries,
        citationUrls: collected.urls,
        title: parsed.title || "Legal research memo",
        fullMemo: parsed.fullMemo || collected.text,
      };
      return { ok: true, memo };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "AI_UNAVAILABLE") return { ok: false, error: "AI_UNAVAILABLE" };
      if (message.includes("abort") || message.toLowerCase().includes("timeout")) {
        return { ok: false, error: "TIMEOUT" };
      }
      if (message === "PARSE" || message.includes("JSON")) return { ok: false, error: "PARSE" };
      return { ok: false, error: message };
    }
  });
