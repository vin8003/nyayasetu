import { contentHash } from "../court-import/hash.ts";

export function textKey(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function bodyHash(body: string, explicit?: string | null): string {
  const given = (explicit ?? "").trim();
  return given || contentHash(body);
}

export type DocLike = {
  id?: string;
  title?: string | null;
  body?: string | null;
  contentHash?: string | null;
  externalId?: string | null;
};

export function findDuplicateDocument<T extends DocLike>(
  candidate: DocLike,
  existing: T[],
): T | undefined {
  const hash = bodyHash(candidate.body ?? "", candidate.contentHash);
  const ext = textKey(candidate.externalId);
  const title = textKey(candidate.title);
  return existing.find((row) => {
    const rowHash = bodyHash(row.body ?? "", row.contentHash);
    if (hash && rowHash && hash === rowHash) return true;
    if (ext && textKey(row.externalId) === ext) return true;
    if (title && title === textKey(row.title) && hash && rowHash && hash === rowHash) return true;
    return false;
  });
}

export type OrderLike = {
  id?: string;
  body?: string | null;
  orderDate?: string | null;
  documentId?: string | null;
  externalId?: string | null;
};

export function findDuplicateOrder<T extends OrderLike>(candidate: OrderLike, existing: T[]): T | undefined {
  const hash = contentHash(candidate.body ?? "");
  const ext = textKey(candidate.externalId);
  return existing.find((row) => {
    if (hash && contentHash(row.body ?? "") === hash) return true;
    if (ext && textKey(row.externalId) === ext) return true;
    return false;
  });
}

export function findDuplicateTask<T extends { title?: string | null; status?: string | null }>(
  title: string,
  existing: T[],
): T | undefined {
  const key = textKey(title);
  if (key.length < 2) return undefined;
  return existing.find((row) => textKey(row.title) === key && row.status !== "dismissed" && row.status !== "dropped");
}

export function findDuplicateDeadline<T extends { title?: string | null; dueOn?: string | null; status?: string | null }>(
  title: string,
  dueOn: string | null | undefined,
  existing: T[],
): T | undefined {
  const key = textKey(title);
  const due = String(dueOn ?? "").slice(0, 10);
  if (!key) return undefined;
  return existing.find(
    (row) =>
      textKey(row.title) === key &&
      String(row.dueOn ?? "").slice(0, 10) === due &&
      row.status !== "dropped" &&
      row.status !== "dismissed",
  );
}

export function findDuplicateHearing<T extends { listedOn?: string | null; purpose?: string | null }>(
  listedOn: string,
  purpose: string | null | undefined,
  existing: T[],
): T | undefined {
  const date = String(listedOn ?? "").slice(0, 10);
  const why = textKey(purpose);
  if (!date) return undefined;
  return existing.find((row) => String(row.listedOn ?? "").slice(0, 10) === date && textKey(row.purpose) === why);
}
