import { createNotifier } from "./pubSub";

export type ColonyBuildings = Record<string, number[]>;

export type ColonyEntry = {
  starBaseLevel: number;
  buildings: ColonyBuildings;
  updatedAt: number;
};

export type ColonyStore = {
  get(colonyId: string): ColonyEntry | null;
  set(colonyId: string, entry: ColonyEntry): void;
  subscribe(colonyId: string, onChange: () => void): () => void;
};

const STORAGE_PREFIX = "gl-colony-";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isColonyBuildings(value: unknown): value is ColonyBuildings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.values(value).every(
    (levels) => Array.isArray(levels) && levels.every(isFiniteNumber),
  );
}

function sortedDescending(buildings: ColonyBuildings): ColonyBuildings {
  return Object.fromEntries(
    Object.entries(buildings).map(([id, levels]) => [id, [...levels].sort((a, b) => b - a)]),
  );
}

export function toColonyEntry(value: unknown): ColonyEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const { starBaseLevel, buildings = {}, updatedAt } = value as Record<string, unknown>;
  if (!isFiniteNumber(starBaseLevel) || !isFiniteNumber(updatedAt)) return null;
  if (!isColonyBuildings(buildings)) return null;
  return { starBaseLevel, buildings: sortedDescending(buildings), updatedAt };
}

function parseEntry(stored: string): ColonyEntry | null {
  try {
    return toColonyEntry(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function createLocalStorageColonyStore(): ColonyStore {
  const sameTab = createNotifier<string>();
  const parsed = new Map<string, { stored: string; entry: ColonyEntry | null }>();
  return {
    get(colonyId) {
      const key = STORAGE_PREFIX + colonyId;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const cached = parsed.get(key);
      if (cached?.stored === stored) return cached.entry;
      const entry = parseEntry(stored);
      parsed.set(key, { stored, entry });
      return entry;
    },
    set(colonyId, entry) {
      localStorage.setItem(STORAGE_PREFIX + colonyId, JSON.stringify(entry));
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
    set(colonyId, entry) {
      values.set(colonyId, entry);
      notifier.notify(colonyId);
    },
    subscribe(colonyId, onChange) {
      return notifier.subscribe((changedId) => {
        if (changedId === colonyId) onChange();
      });
    },
  };
}
