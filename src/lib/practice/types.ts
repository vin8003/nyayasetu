import type { OutputLang } from "@/lib/research/types";

export const PROCEEDINGS = [
  "civil",
  "commercial",
  "criminal",
  "writ",
  "appellate",
  "family",
  "consumer",
  "arbitration",
  "execution",
] as const;
export type ProceedingId = (typeof PROCEEDINGS)[number];

export const OUR_SIDES = [
  "petitioner",
  "respondent",
  "accused",
  "complainant",
  "appellant",
  "other",
] as const;
export type OurSide = (typeof OUR_SIDES)[number];

export type Origin =
  | "court_direction"
  | "ai_suggestion"
  | "ai_inference"
  | "statute"
  | "lawyer"
  | "system";

export type MatterStatus = "active" | "stayed" | "dormant" | "closed";
export type TaskStatus = "open" | "done" | "dismissed";
export type DeadlineStatus = "open" | "done" | "dropped";

export type Party = { role: string; name: string };

export type Client = {
  id: string;
  name: string;
  notes: string;
};

export type Matter = {
  id: string;
  clientId: string | null;
  clientName: string;
  title: string;
  proceeding: ProceedingId | string;
  stage: string;
  courtName: string;
  caseNumber: string;
  cnr: string;
  caseType: string;
  jurisdiction: string;
  ourSide: string;
  parties: Party[];
  status: MatterStatus | string;
  nextHearingOn: string | null;
  lastOrderOn: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Hearing = {
  id: string;
  matterId: string;
  matterTitle?: string;
  courtName?: string;
  listedOn: string;
  listedAt: string;
  courtRoom: string;
  bench: string;
  purpose: string;
  stage: string;
  outcome: string;
  nextDate: string | null;
  notes: string;
  createdAt: string;
};

export type MatterDocument = {
  id: string;
  matterId: string;
  kind: string;
  title: string;
  text: string;
  sourceKind: string;
  createdAt: string;
};

export type OrderDirection = {
  text: string;
  party: string;
  deadline: string | null;
  quote: string;
};

export type MatterOrder = {
  id: string;
  matterId: string;
  matterTitle?: string;
  documentId: string | null;
  orderDate: string | null;
  body: string;
  directions: OrderDirection[];
  confirmed: boolean;
  createdAt: string;
};

export type Task = {
  id: string;
  matterId: string | null;
  matterTitle?: string;
  title: string;
  origin: Origin | string;
  status: TaskStatus | string;
  dueOn: string | null;
  sourceQuote: string;
  createdAt: string;
};

export type Deadline = {
  id: string;
  matterId: string | null;
  matterTitle?: string;
  title: string;
  dueOn: string;
  origin: Origin | string;
  sourceQuote: string;
  status: DeadlineStatus | string;
  createdAt: string;
};

export type TimelineEvent = {
  id: string;
  matterId: string;
  happenedOn: string;
  kind: string;
  title: string;
  detail: string;
  origin: Origin | string;
  refId: string | null;
  createdAt: string;
};

export type MatterBundle = {
  matter: Matter;
  hearings: Hearing[];
  documents: MatterDocument[];
  orders: MatterOrder[];
  tasks: Task[];
  deadlines: Deadline[];
  timeline: TimelineEvent[];
};

export type TodayBoard = {
  hearingsToday: Hearing[];
  hearingsUpcoming: Hearing[];
  deadlines: Deadline[];
  openTasks: Task[];
  unconfirmedOrders: MatterOrder[];
  staleMatters: Matter[];
  sampleLoaded?: boolean;
  counts: {
    hearingsToday: number;
    deadlines: number;
    openTasks: number;
    unconfirmedOrders: number;
    staleMatters: number;
  };
};

export type OrderExtract = {
  summary: string;
  nextHearing: { date: string; purpose: string } | null;
  directions: OrderDirection[];
  suggestedTasks: { title: string; reason: string }[];
  stageHint: string | null;
  caveats: string[];
};

export type StageBranch = { id: string; to: string; when: string };

export type StageDef = {
  id: string;
  label: string;
  labelHi: string;
  what: string;
  lawyer: string;
  court: string;
  docs: string[];
  deadlines: string[];
  next: string[];
  branches: StageBranch[];
  ai: string[];
  human: string[];
};

export type ProceedingDef = {
  id: ProceedingId | string;
  label: string;
  labelHi: string;
  statute: string;
  note: string;
  stages: StageDef[];
};

export type SamplePack = {
  clients: Client[];
  matters: Array<
    Omit<Matter, "clientName" | "createdAt" | "updatedAt" | "status"> & {
      status: string;
    }
  >;
  hearings: Array<Omit<Hearing, "createdAt" | "outcome" | "nextDate" | "notes" | "matterTitle" | "courtName"> & Partial<Hearing>>;
  tasks: Array<Pick<Task, "id" | "matterId" | "title" | "origin" | "dueOn" | "sourceQuote">>;
  deadlines: Array<Pick<Deadline, "id" | "matterId" | "title" | "dueOn" | "origin" | "sourceQuote">>;
  events: Array<Pick<TimelineEvent, "id" | "matterId" | "happenedOn" | "kind" | "title" | "detail" | "origin"> & { refId?: string | null }>;
  documents?: Array<Pick<MatterDocument, "id" | "matterId" | "kind" | "title"> & { body: string; sourceKind?: string }>;
  orders?: Array<{
    id: string;
    matterId: string;
    documentId?: string | null;
    orderDate: string;
    body: string;
    directions: OrderDirection[];
    confirmed: boolean;
  }>;
};

export type { OutputLang };
