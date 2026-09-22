export type DropEntry = {
  readyAt: number | null;
  updatedAt: number;
};

export type DropStore = {
  get(key: string): DropEntry | null;
  set(key: string, readyAt: number | null, updatedAt: number): void;
  subscribe(key: string, onChange: () => void): () => void;
};

export const OLDEST_UPDATED_AT = 0;

function parseLegacyEntry(stored: string): DropEntry | null {
  const readyAt = Number(stored);
  return Number.isFinite(readyAt) ? { readyAt, updatedAt: OLDEST_UPDATED_AT } : null;
}

function isDropEntry(value: unknown): value is DropEntry {
  if (typeof value !== "object" || value === null) return false;
  const { readyAt, updatedAt } = value as Record<string, unknown>;
  const hasValidReadyAt =
    readyAt === null || (typeof readyAt === "number" && Number.isFinite(readyAt));
  const hasValidUpdatedAt = typeof updatedAt === "number" && Number.isFinite(updatedAt);
  return hasValidReadyAt && hasValidUpdatedAt;
}

function parseEntry(stored: string): DropEntry | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    if (isDropEntry(parsed)) return parsed;
  } catch {}
  return parseLegacyEntry(stored);
}

export function createLocalStorageDropStore(): DropStore {
  return {
    get(key) {
      const stored = localStorage.getItem(key);
      return stored ? parseEntry(stored) : null;
    },
    set(key, readyAt, updatedAt) {
      localStorage.setItem(key, JSON.stringify({ readyAt, updatedAt }));
    },
    subscribe(key, onChange) {
      const handleStorage = (event: StorageEvent) => {
        if (event.storageArea !== localStorage) return;
        if (event.key === null || event.key === key) onChange();
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
  };
}

export function createMemoryDropStore(initial: Record<string, number> = {}): DropStore {
  const values = new Map<string, DropEntry>(
    Object.entries(initial).map(([key, readyAt]) => [
      key,
      { readyAt, updatedAt: OLDEST_UPDATED_AT },
    ]),
  );
  const listeners = new Map<string, Set<() => void>>();
  return {
    get: (key) => values.get(key) ?? null,
    set(key, readyAt, updatedAt) {
      const previous = values.get(key)?.readyAt ?? null;
      values.set(key, { readyAt, updatedAt });
      if (previous !== readyAt) listeners.get(key)?.forEach((onChange) => onChange());
    },
    subscribe(key, onChange) {
      const keyListeners = listeners.get(key) ?? new Set<() => void>();
      keyListeners.add(onChange);
      listeners.set(key, keyListeners);
      return () => keyListeners.delete(onChange);
    },
  };
}
