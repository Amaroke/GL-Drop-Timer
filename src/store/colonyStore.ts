import { createNotifier } from "./pubSub";

export type ColonyEntry = {
  starBaseLevel: number;
  updatedAt: number;
};

export type ColonyStore = {
  get(colonyId: string): ColonyEntry | null;
  set(colonyId: string, starBaseLevel: number, updatedAt: number): void;
  subscribe(colonyId: string, onChange: () => void): () => void;
};

const STORAGE_PREFIX = "gl-colony-";

export function isColonyEntry(value: unknown): value is ColonyEntry {
  if (typeof value !== "object" || value === null) return false;
  const { starBaseLevel, updatedAt } = value as Record<string, unknown>;
  return (
    typeof starBaseLevel === "number" &&
    Number.isFinite(starBaseLevel) &&
    typeof updatedAt === "number" &&
    Number.isFinite(updatedAt)
  );
}

function parseEntry(stored: string): ColonyEntry | null {
  try {
    const parsed: unknown = JSON.parse(stored);
    if (isColonyEntry(parsed)) return parsed;
  } catch {}
  return null;
}

export function createLocalStorageColonyStore(): ColonyStore {
  const sameTab = createNotifier<string>();
  return {
    get(colonyId) {
      const stored = localStorage.getItem(STORAGE_PREFIX + colonyId);
      return stored ? parseEntry(stored) : null;
    },
    set(colonyId, starBaseLevel, updatedAt) {
      localStorage.setItem(STORAGE_PREFIX + colonyId, JSON.stringify({ starBaseLevel, updatedAt }));
      sameTab.notify(colonyId);
    },
    subscribe(colonyId, onChange) {
      const key = STORAGE_PREFIX + colonyId;
      const handleStorage = (event: StorageEvent) => {
        if (event.storageArea !== localStorage) return;
        if (event.key === null || event.key === key) onChange();
      };
      window.addEventListener("storage", handleStorage);
      const unsubscribeSameTab = sameTab.subscribe((changedId) => {
        if (changedId === colonyId) onChange();
      });
      return () => {
        window.removeEventListener("storage", handleStorage);
        unsubscribeSameTab();
      };
    },
  };
}

export function createMemoryColonyStore(): ColonyStore {
  const values = new Map<string, ColonyEntry>();
  const notifier = createNotifier<string>();
  return {
    get: (colonyId) => values.get(colonyId) ?? null,
    set(colonyId, starBaseLevel, updatedAt) {
      values.set(colonyId, { starBaseLevel, updatedAt });
      notifier.notify(colonyId);
    },
    subscribe(colonyId, onChange) {
      return notifier.subscribe((changedId) => {
        if (changedId === colonyId) onChange();
      });
    },
  };
}
