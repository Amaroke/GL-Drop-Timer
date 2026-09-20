export type DropStore = {
  get(key: string): number | null;
  set(key: string, readyAt: number | null): void;
  subscribe(key: string, onChange: () => void): () => void;
};

export function createLocalStorageDropStore(): DropStore {
  return {
    get(key) {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const readyAt = Number(stored);
      return Number.isFinite(readyAt) ? readyAt : null;
    },
    set(key, readyAt) {
      if (readyAt === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(readyAt));
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
  const values = new Map<string, number>(Object.entries(initial));
  const listeners = new Map<string, Set<() => void>>();
  return {
    get: (key) => values.get(key) ?? null,
    set(key, readyAt) {
      const previous = values.get(key) ?? null;
      if (readyAt === null) values.delete(key);
      else values.set(key, readyAt);
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
