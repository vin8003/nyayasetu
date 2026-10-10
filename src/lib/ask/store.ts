import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { researchModel } from "@/lib/ai/models";
import { asErrorMessage, collectFromOutput, XaiHttpError, type XaiResponse } from "@/lib/ai/xai-response";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { formatParties } from "@/lib/practice/ids";
import { isSampleTitle } from "@/lib/practice/sample-ids";
import { loadMatterBundle } from "@/lib/practice/store";
import { hostAllowed } from "@/lib/research/verify";
import { groundAskReply } from "./citations";
import { ASK_TIMEOUT_MS, askResponsesBody, type AskCase } from "./prompt";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12000),
});

const askInputSchema = z
  .object({
    matterId: z.string().trim().max(80).optional(),
    lang: z.enum(["en", "hi"]),
    messages: z.array(messageSchema).min(1).max(12),
  })
  .refine((input) => input.messages.at(-1)?.role === "user", {
    message: "Last message must be from the advocate",
  });

export type AskInput = z.infer<typeof askInputSchema>;

function priorSources(messages: { role: string; content: string }[]): string[] {
  const urls: string[] = [];
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const match of message.content.matchAll(/https?:\/\/[^\s)]+/g)) {
      if (hostAllowed(match[0])) urls.push(match[0]);
    }
  }
  return urls;
}

function fileFromBundle(bundle: {
  matter: {
    title?: string;
    courtName?: string;
    caseNumber?: string;
    cnr?: string;
    stage?: string;
    ourSide?: string;
    parties?: { role?: string; name?: string }[];
    notes?: string;
    nextHearingOn?: string | null;
  };
  hearings?: { listedOn?: string; purpose?: string; outcome?: string }[];
  orders?: { orderDate?: string; confirmed?: boolean; body?: string }[];
  tasks?: { title?: string; status?: string; dueOn?: string | null }[];
  deadlines?: { title?: string; dueOn?: string | null; status?: string }[];
}): AskCase {
  const matter = bundle.matter;
  return {
    title: String(matter.title ?? ""),
    courtName: String(matter.courtName ?? ""),
    caseNumber: String(matter.caseNumber ?? ""),
    cnr: String(matter.cnr ?? ""),
    stage: String(matter.stage ?? ""),
    ourSide: String(matter.ourSide ?? ""),
    parties: formatParties(matter.parties),
    notes: String(matter.notes ?? ""),
    nextHearingOn: matter.nextHearingOn ? String(matter.nextHearingOn).slice(0, 10) : "",
    hearings: (bundle.hearings ?? []).slice(0, 4).map((h) => ({
      listedOn: h.listedOn ? String(h.listedOn).slice(0, 10) : "",
      purpose: String(h.purpose ?? ""),
      outcome: String(h.outcome ?? ""),
    })),
    orders: (bundle.orders ?? []).slice(0, 3).map((o) => ({
      orderDate: o.orderDate ? String(o.orderDate).slice(0, 10) : "",
      confirmed: Boolean(o.confirmed),
      body: String(o.body ?? ""),
    })),
    tasks: (bundle.tasks ?? []).slice(0, 8).map((t) => ({
      title: String(t.title ?? ""),
      status: String(t.status ?? ""),
      dueOn: t.dueOn ? String(t.dueOn).slice(0, 10) : "",
    })),
    deadlines: (bundle.deadlines ?? []).slice(0, 8).map((d) => ({
      title: String(d.title ?? ""),
      dueOn: d.dueOn ? String(d.dueOn).slice(0, 10) : "",
      status: String(d.status ?? ""),
    })),
  };
}

export const askChamber = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AskInput) => askInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI_UNAVAILABLE" };

    let file: AskCase | null = null;
    let demo = false;
    if (data.matterId) {
      const bundle = await loadMatterBundle(context.userId, data.matterId);
      if (!bundle) return { ok: false, error: "MATTER_NOT_FOUND" };
      file = fileFromBundle(bundle);
      demo = isSampleTitle(file.title);
    }

    const gated = await gateAi(context.userId, { demo });
    if (!gated.ok) return gated;

    const model = researchModel();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
    try {
      const res = await fetch("https://api.x.ai/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(
          askResponsesBody({
            model,
            lang: data.lang,
            file,
            messages: data.messages,
            priorSources: priorSources(data.messages),
          }),
        ),
      });
      if (!res.ok) return { ok: false, error: "ASK_FAILED" };
      const payload = (await res.json()) as XaiResponse;
      const err = asErrorMessage(payload.error);
      if (err) return { ok: false, error: "ASK_FAILED" };
      const collected = collectFromOutput(payload);
      const grounded = groundAskReply(collected.text, [...collected.urls, ...priorSources(data.messages)]);
      if (!grounded.text) return { ok: false, error: "ASK_FAILED" };
      return { ok: true, text: grounded.text };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (err instanceof XaiHttpError || message.includes("abort")) return { ok: false, error: "ASK_FAILED" };
      return { ok: false, error: "ASK_FAILED" };
    } finally {
      clearTimeout(timer);
    }
  });
