import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny stale-while-revalidate store for per-user list data. Pages paint the last
 * known value instantly on revisit and still refetch in the background, so
 * navigation never starts from a blank skeleton. Keyed by user id so one
 * account's data can never show for another.
 */
const cache = new Map<string, unknown>();

export function useSwrState<T>(
  key: string,
  userId: string | null | undefined,
  initial: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const keyRef = useRef<string | null>(null);
  keyRef.current = userId ? `${userId}:${key}` : null;

  useEffect(() => {
    if (!userId) return;
    const hit = cache.get(`${userId}:${key}`);
    if (hit !== undefined) setValue(hit as T);
  }, [key, userId]);

  const set = useCallback((next: T) => {
    if (keyRef.current) cache.set(keyRef.current, next);
    setValue(next);
  }, []);
  return [value, set];
}
