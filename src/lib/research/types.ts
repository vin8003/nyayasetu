export const SIDES = ["petitioner", "respondent", "neutral"] as const;
export type Side = (typeof SIDES)[number];

export const OUTPUT_LANGS = ["hi", "en"] as const;
export type OutputLang = (typeof OUTPUT_LANGS)[number];

export const PRACTICE_AREAS = [
  "constitutional",
  "criminal",
  "civil",
  "family",
  "property",
  "service",
  "labour",
  "consumer",
  "tax",
  "arbitration",
  "company",
  "ipr",
  "writ",
  "other",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

export type Intake = {
  facts: string;
  query: string;
  courtId: string;
  area: PracticeArea;
  side: Side;
  lang: OutputLang;
};

export type Binding = "binding" | "persuasive" | "distinguishable";
export type Strength = "strong" | "moderate" | "contested";

export type LegalIssue = {
  issue: string;
  framing: string;
};

export type StatuteRef = {
  name: string;
  sections: string;
  why: string;
  url: string;
};

export type Doctrine = {
  name: string;
  explanation: string;
  leadingCase: string;
};

export type Precedent = {
  title: string;
  citation: string;
  court: string;
  year: string;
  ratio: string;
  factsOverlap: string;
  holding: string;
  howToUse: string;
  url: string;
  binding: Binding;
  verified: boolean;
};

export type CourtPoint = {
  point: string;
  likelyOutcome: string;
  strength: Strength;
};

export type SourceLink = {
  title: string;
  url: string;
  publisher: string;
};

export type LegalMemo = {
  title: string;
  causeTitle: string;
  courtsConsulted: string[];
  factsSummary: string;
  issues: LegalIssue[];
  statutes: StatuteRef[];
  doctrines: Doctrine[];
  precedents: Precedent[];
  pointsForCourt: CourtPoint[];
  argumentsFor: string[];
  argumentsAgainst: string[];
  counters: string[];
  strategy: string;
  risks: string[];
  fullMemo: string;
  sources: SourceLink[];
  unverified: string[];
  searchedQueries: string[];
  citationUrls: string[];
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  intake: Intake;
  memo: LegalMemo;
};

export const LETTER_KINDS = ["notice", "reply", "petition", "writtenStatement"] as const;
export type LetterKind = (typeof LETTER_KINDS)[number];

export type LetterGround = {
  heading: string;
  text: string;
  citation: string;
  url: string;
};

export type LegalLetter = {
  kind: LetterKind;
  lang: OutputLang;
  heading: string;
  parties: string;
  facts: string;
  grounds: LetterGround[];
  closing: string;
  timeOrStand: string;
  verification: string;
  risks: string;
};

export const emptyIntake = (lang: OutputLang = "en"): Intake => ({
  facts: "",
  query: "",
  courtId: "all",
  area: "civil",
  side: "neutral",
  lang,
});
