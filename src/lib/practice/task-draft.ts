import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "./sample-ids";
import { loadMatterBundle, saveAiDraftDocument } from "./store";
import { pullJson } from "@/lib/ai/json";
import { INDIAN_LAW_CONTEXT } from "@/lib/ai/context";
import { DEFAULT_FAST_MODEL, fastModel } from "@/lib/ai/models";
import { sendWithFallback, withRepairTurn } from "@/lib/ai/retry";
import { chatJsonFormat, list, obj, str } from "@/lib/ai/schema";
import { XaiHttpError, chatText } from "@/lib/ai/xai-response";
import {
  classifyTaskDraft,
  draftFromBundle,
  filePrompt,
  formatTaskDraft,
  kindInstruction,
  type TaskDraft,
  type TaskDraftKind,
} from "./task-draft-class";
import type { Deadline, Task } from "./types";

export {
  classifyTaskDraft,
  draftFromBundle,
  formatTaskDraft,
  type TaskDraft,
  type TaskDraftKind,
} from "./task-draft-class";

const DRAFT_TIMEOUT_MS = 60_000;
const DRAFT_MIN_RETRY_MS = 20_000;

const DRAFT_JSON_SCHEMA = obj({
  title: str(),
  heading: str(),
  parties: str(),
  body: str(),
  prayer: str(),
  verification: str(),
  caveats: list(str()),
});

const draftSchema = z.object({
  title: z.string().catch(""),
  heading: z.string().catch(""),
  parties: z.string().catch(""),
  body: z.string().catch(""),
  prayer: z.string().catch(""),
  verification: z.string().catch(""),
  caveats: z.array(z.string()).catch([]),
});

async function draftFromModel(
  bundle: Parameters<typeof draftFromBundle>[0],
  item: { title: string; sourceQuote: string; dueOn: string | null },
  kind: TaskDraftKind,
  lang: "en" | "hi",
): Promise<TaskDraft | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const model = fastModel();
  const messages = [
    {
      role: "system",
      content: `You draft Indian court papers for an advocate from the case file. JSON only:
{
  "title": "short filing title",
  "heading": "court, case number and cause title as on the file",
  "parties": "role: name lines",
  "body": "the full draft in numbered paragraphs",
  "prayer": "prayer with lettered clauses, or empty",
  "verification": "verification, or empty",
  "caveats": ["what the advocate must check or fill in"]
}
${kindInstruction(kind)}
Never invent a citation, URL, date, or party. Not legal advice.

${INDIAN_LAW_CONTEXT}`,
    },
    { role: "user", content: filePrompt(bundle, item, kind, lang) },
  ];
  const deadline = Date.now() + DRAFT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DRAFT_TIMEOUT_MS);
  try {
    const send = async (body: object): Promise<string> => {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new XaiHttpError(res.status, await res.text().catch(() => ""));
      return chatText(await res.json());
    };
    const { value: parsed } = await sendWithFallback({
      tag: "task-draft",
      send,
      build: ({ legacy, repair }) => ({
        model: legacy ? DEFAULT_FAST_MODEL : model,
        temperature: 0.2,
        max_tokens: 4000,
        response_format: legacy ? { type: "json_object" } : chatJsonFormat("task_draft", DRAFT_JSON_SCHEMA),
        messages: withRepairTurn(messages, repair),
      }),
      parse: (text) => draftSchema.parse(pullJson(text)),
      deadline,
      minRetryMs: DRAFT_MIN_RETRY_MS,
    });
    if (!parsed.body.trim() && !parsed.heading.trim()) return null;
    return {
      kind,
      title: parsed.title.trim() || item.title.slice(0, 180),
      heading: parsed.heading,
      parties: parsed.parties,
      body: parsed.body,
      prayer: parsed.prayer,
      verification: parsed.verification,
      caveats: parsed.caveats.length
        ? parsed.caveats
        : ["Check the last order before filing.", "Not legal advice."],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type WorkItem = Task | Deadline;

export const draftForWork = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { matterId: string; itemId: string; itemKind: "task" | "deadline"; lang?: "en" | "hi" }) =>
    z
      .object({
        matterId: z.string().min(1),
        itemId: z.string().min(1),
        itemKind: z.enum(["task", "deadline"]),
        lang: z.enum(["en", "hi"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const bundle = await loadMatterBundle(context.userId, data.matterId);
    if (!bundle) return { ok: false as const, error: "NOT_FOUND" };
    const item: WorkItem | undefined =
      data.itemKind === "task"
        ? bundle.tasks.find((row: { id: string }) => row.id === data.itemId)
        : bundle.deadlines.find((row: { id: string }) => row.id === data.itemId);
    if (!item) return { ok: false as const, error: "NOT_FOUND" };
    const classified = classifyTaskDraft(item.title, item.sourceQuote);
    if (!classified.draftable) {
      return { ok: true as const, draftable: false as const, reason: classified.reason };
    }
    const demo = looksLikeSample({ title: bundle.matter.title });
    const gated = await gateAi(context.userId, { demo });
    if (!gated.ok) return gated;
    const payload = {
      title: item.title,
      sourceQuote: item.sourceQuote,
      dueOn: item.dueOn ?? null,
    };
    const fromModel = await draftFromModel(bundle, payload, classified.kind, data.lang ?? "en");
    const draft = fromModel ?? (demo ? draftFromBundle(bundle, payload, classified.kind) : null);
    if (!draft) return { ok: false as const, error: "AI_UNAVAILABLE" };
    const body = formatTaskDraft(draft);
    const documentId = await saveAiDraftDocument(
      context.userId,
      bundle.matter.id,
      draft.title || item.title,
      classified.kind,
      body,
    );
    return { ok: true as const, draftable: true as const, kind: classified.kind, draft, documentId, body };
  });
