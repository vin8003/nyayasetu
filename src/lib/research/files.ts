import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { gateAi } from "@/lib/billing/store";
import { looksLikeSample } from "@/lib/practice/sample-ids";
import { z } from "zod";
import { fastModel } from "@/lib/ai/models";
import { chatText, type ChatResponse } from "@/lib/ai/xai-response";

const OCR_TIMEOUT_MS = 45_000;

const uploadSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().max(180),
        mime: z.string().max(120),
        base64: z.string().max(1_800_000),
      }),
    )
    .max(3),
  facts: z.string().max(20000).optional(),
});

function decodeBase64(b64: string): Uint8Array {
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf);
}

function isImage(mime: string, name: string) {
  return mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
}

function isPdf(mime: string, name: string) {
  return mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

function isTextLike(mime: string, name: string) {
  return (
    mime.startsWith("text/") ||
    /\.(txt|md|csv|rtf|json|html|htm)$/i.test(name)
  );
}

export const OCR_PROMPT = `Transcribe this Indian legal document or photo exactly.
- Copy every readable word in the original language and script (Devanagari stays Devanagari). Do not translate, summarise or correct.
- Keep the layout: paragraph numbers, line breaks between paragraphs, headings, cause title, case number, dates and amounts exactly as written.
- Tables: one row per line, cells separated by " | ".
- Stamps, seals and handwriting: transcribe if legible, otherwise write [illegible].
Return plain text only. No commentary.`;

async function ocrImage(name: string, mime: string, base64: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return `[${name}: image attached, OCR unavailable]`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: fastModel(),
        temperature: 0,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mime || "image/jpeg"};base64,${base64}`, detail: "high" },
              },
              { type: "text", text: OCR_PROMPT },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return `[${name}: could not read image]`;
    const body = (await res.json()) as ChatResponse;
    return chatText(body).trim() || `[${name}: empty image text]`;
  } catch {
    return `[${name}: could not read image in time]`;
  } finally {
    clearTimeout(timer);
  }
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const result = (await extractText(bytes, { mergePages: true })) as {
    text?: string | string[];
  };
  const text = Array.isArray(result.text) ? result.text.join("\n") : (result.text ?? "");
  return text.replace(/\s+\n/g, "\n").trim();
}

export const extractUploads = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const gated = await gateAi(context.userId, { demo: looksLikeSample({ facts: data.facts }) });
    if (!gated.ok) return gated;
    const parts: { name: string; text: string }[] = [];
    for (const file of data.files) {
      try {
        if (isTextLike(file.mime, file.name)) {
          const text = Buffer.from(file.base64, "base64").toString("utf8");
          parts.push({ name: file.name, text: text.slice(0, 12000) });
          continue;
        }
        if (isPdf(file.mime, file.name)) {
          const text = await pdfText(decodeBase64(file.base64));
          parts.push({ name: file.name, text: (text || `[${file.name}: no extractable PDF text]`).slice(0, 12000) });
          continue;
        }
        if (isImage(file.mime, file.name)) {
          const text = await ocrImage(file.name, file.mime, file.base64);
          parts.push({ name: file.name, text: text.slice(0, 12000) });
          continue;
        }
        parts.push({ name: file.name, text: `[${file.name}: unsupported type]` });
      } catch {
        parts.push({ name: file.name, text: `[${file.name}: could not read file]` });
      }
    }
    const combined = parts
      .map((p) => `--- ${p.name} ---\n${p.text}`)
      .join("\n\n")
      .slice(0, 16000);
    return { ok: true as const, parts, combined };
  });
