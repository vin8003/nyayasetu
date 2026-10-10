import { z } from "zod";
import { PRACTICE_AREAS, SIDES, OUTPUT_LANGS } from "./types.ts";
import { bool, list, obj, str as jstr, strEnum } from "../ai/schema.ts";

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


/** Structured-output schema for the research and follow-up memo. Mirrors memoSchema. */
export const MEMO_JSON_SCHEMA = obj({
  title: jstr("short cause title"),
  causeTitle: jstr("Party v. Party (forum)"),
  courtsConsulted: list(jstr()),
  factsSummary: jstr("tight facts with dates"),
  issues: list(obj({ issue: jstr(), framing: jstr("how the court would frame it") })),
  statutes: list(obj({ name: jstr(), sections: jstr(), why: jstr(), url: jstr() })),
  doctrines: list(obj({ name: jstr(), explanation: jstr(), leadingCase: jstr() })),
  precedents: list(
    obj({
      title: jstr(),
      citation: jstr(),
      court: jstr(),
      year: jstr(),
      ratio: jstr("ratio decidendi from the judgment itself"),
      factsOverlap: jstr("concrete facts shared with this matter"),
      holding: jstr(),
      howToUse: jstr("where and how to deploy it in the pleading or argument"),
      url: jstr("exact URL of a page retrieved by web_search, or empty"),
      binding: strEnum(["binding", "persuasive", "distinguishable"]),
      verified: bool(),
    }),
  ),
  pointsForCourt: list(
    obj({ point: jstr(), likelyOutcome: jstr(), strength: strEnum(["strong", "moderate", "contested"]) }),
  ),
  argumentsFor: list(jstr()),
  argumentsAgainst: list(jstr()),
  counters: list(jstr("answer to the matching argumentsAgainst item")),
  strategy: jstr(),
  risks: list(jstr()),
  fullMemo: jstr(),
  sources: list(obj({ title: jstr(), url: jstr(), publisher: jstr() })),
  unverified: list(jstr()),
});
