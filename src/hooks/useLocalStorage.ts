import { useCallback, useEffect, useState } from "react";

/** Reads and writes a JSON value in localStorage, staying in sync across tabs. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      return initialValue;
    }
  });

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue(current => {
        const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage may be unavailable (private mode) — state still works */
        }
        return resolved;
      });
    },
    [key]
  );

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== key || event.newValue === null) return;
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        /* ignore malformed cross-tab payloads */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [value, update] as const;
}
