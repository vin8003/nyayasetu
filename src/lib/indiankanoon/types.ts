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
