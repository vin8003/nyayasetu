export const IK_SOURCE_KIND = "indiankanoon";
export const IK_MIN_BODY = 20;
export const IK_MAX_DOCS = 10;

export type IkSearchHit = {
  tid: string;
  title: string;
  headline: string;
  docsource: string;
  publishdate: string;
};

export type IkDocument = IkSearchHit & {
  body: string;
  sourceUrl: string;
};

/** One network attempt inside the live transport, for diagnostics. Never holds headers or the token. */
export type IkAttempt = {
  via: string;
  round: number;
  ms: number;
  status?: number;
  code?: string;
};
