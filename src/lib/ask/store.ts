import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { researchModel } from "@/lib/ai/models";
import { asErrorMessage, collectFromOutput, XaiHttpError, type XaiResponse } from "@/lib/ai/xai-response";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { gateAi } from "@/lib/billing/store";
import { formatParties, newId } from "@/lib/practice/ids";
import { isSampleTitle } from "@/lib/practice/sample-ids";
import { loadMatterBundle } from "@/lib/practice/store";
import { hostAllowed } from "@/lib/research/verify";
import { groundAskReply } from "./citations";
import { ASK_TIMEOUT_MS, askResponsesBody, type AskCase } from "./prompt";
import { chatTitle, type AskChatRow } from "./threads";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12000),
});

const askInputSchema = z
  .object({
    matterId: z.string().trim().max(80).optional(),
    chatId: z.string().trim().max(80).optional(),
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

function stamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

async function openOwnedChat(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  chatId: string,
  matterId?: string,
) {
  const rows = await sql`select id, matter_id from ask_chats where id = ${chatId} and user_id = ${userId}`;
  const row = rows[0];
  if (!row) return null;
  if ((row.matter_id ?? null) !== (matterId || null)) return null;
  return String(row.id);
}

async function saveTurn(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  data: { matterId?: string; chatId?: string; messages: { role: string; content: string }[] },
  answer: string,
) {
  const latest = data.messages.at(-1);
  if (!latest || latest.role !== "user") return data.chatId ?? "";
  let chatId = data.chatId ? await openOwnedChat(sql, userId, data.chatId, data.matterId) : null;
  if (!chatId) {
    chatId = newId("ak");
    let matterTitle = "";
    if (data.matterId) {
      const matters = await sql`select title from matters where id = ${data.matterId} and user_id = ${userId}`;
      matterTitle = String(matters[0]?.title ?? "");
    }
    await sql`
      insert into ask_chats (id, user_id, matter_id, matter_title, title)
      values (${chatId}, ${userId}, ${data.matterId ?? null}, ${matterTitle}, ${chatTitle(latest.content)})
    `;
  }
  await sql`
    insert into ask_messages (id, chat_id, user_id, role, content)
    values (${newId("am")}, ${chatId}, ${userId}, ${"user"}, ${latest.content})
  `;
  await sql`
    insert into ask_messages (id, chat_id, user_id, role, content)
    values (${newId("am")}, ${chatId}, ${userId}, ${"assistant"}, ${answer})
  `;
  await sql`update ask_chats set updated_at = now() where id = ${chatId} and user_id = ${userId}`;
  return chatId;
}

export const listAskChats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AskChatRow[]> => {
    const sql = await getSql();
    const rows = await sql`
      select id, matter_id, matter_title, title, updated_at
      from ask_chats where user_id = ${context.userId}
      order by updated_at desc
    `;
    return rows.map((row) => ({
      id: String(row.id),
      matterId: row.matter_id ? String(row.matter_id) : null,
      matterTitle: String(row.matter_title ?? ""),
      title: String(row.title ?? ""),
      updatedAt: stamp(row.updated_at),
    }));
  });

export const openAskChat = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => z.string().trim().min(1).max(80).parse(id))
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const chats = await sql`
      select id, matter_id, matter_title, title from ask_chats
      where id = ${id} and user_id = ${context.userId}
    `;
    const chat = chats[0];
    if (!chat) return null;
    const messages = await sql`
      select role, content from ask_messages
      where chat_id = ${id} and user_id = ${context.userId}
      order by created_at asc
    `;
    return {
      id: String(chat.id),
      matterId: chat.matter_id ? String(chat.matter_id) : null,
      matterTitle: String(chat.matter_title ?? ""),
      title: String(chat.title ?? ""),
      messages: messages
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({ role: row.role as "user" | "assistant", content: String(row.content ?? "") })),
    };
  });

export const askChamber = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AskInput) => askInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true; text: string; chatId: string } | { ok: false; error: string }> => {
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
      const chatId = await saveTurn(await getSql(), context.userId, data, grounded.text);
      return { ok: true, text: grounded.text, chatId };
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (err instanceof XaiHttpError || message.includes("abort")) return { ok: false, error: "ASK_FAILED" };
      return { ok: false, error: "ASK_FAILED" };
    } finally {
      clearTimeout(timer);
    }
  });
