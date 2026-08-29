import { z } from "zod";
import { PRACTICE_AREAS, SIDES, OUTPUT_LANGS } from "./types";

export const intakeSchema = z.object({
  facts: z.string().trim().min(40).max(20000),
  query: z.string().trim().max(2000),
  courtId: z.string().min(1).max(40),
  area: z.enum(PRACTICE_AREAS),
  side: z.enum(SIDES),
  lang: z.enum(OUTPUT_LANGS),
});

const str = (max = 4000) => z.string().catch("");
const arr = <T extends z.ZodType>(item: T) => z.array(item).catch([]);

export const memoSchema = z.object({
  title: str(180),
  causeTitle: str(240),
  courtsConsulted: arr(z.string()),
  factsSummary: str(4000),
  issues: arr(
    z.object({
      issue: str(400),
      framing: str(1200),
    }),
  ),
  statutes: arr(
    z.object({
      name: str(240),
      sections: str(240),
      why: str(1200),
      url: str(500),
    }),
  ),
  doctrines: arr(
    z.object({
      name: str(180),
      explanation: str(1500),
      leadingCase: str(240),
    }),
  ),
  precedents: arr(
    z.object({
      title: str(240),
      citation: str(240),
      court: str(180),
      year: str(12),
      ratio: str(2000),
      factsOverlap: str(1200),
      holding: str(1500),
      howToUse: str(1200),
      url: str(500),
      binding: z.enum(["binding", "persuasive", "distinguishable"]).catch("persuasive"),
      verified: z.boolean().catch(false),
    }),
  ),
  pointsForCourt: arr(
    z.object({
      point: str(400),
      likelyOutcome: str(1200),
      strength: z.enum(["strong", "moderate", "contested"]).catch("moderate"),
    }),
  ),
  argumentsFor: arr(z.string()),
  argumentsAgainst: arr(z.string()),
  counters: arr(z.string()),
  strategy: str(4000),
  risks: arr(z.string()),
  fullMemo: str(20000),
  sources: arr(
    z.object({
      title: str(240),
      url: str(500),
      publisher: str(120),
    }),
  ),
  unverified: arr(z.string()),
});
