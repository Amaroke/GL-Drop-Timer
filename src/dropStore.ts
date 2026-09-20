export type DropStore = {
  get(key: string): number | null;
  set(key: string, readyAt: number | null): void;
};

export function createLocalStorageDropStore(): DropStore {
  return {
    get(key) {
      const stored = localStorage.getItem(key);
      return stored ? Number(stored) : null;
    },
    set(key, readyAt) {
      if (readyAt === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(readyAt));
    },
  };
}

export function createMemoryDropStore(initial: Record<string, number> = {}): DropStore {
  const values = new Map<string, number>(Object.entries(initial));
  return {
    get: (key) => values.get(key) ?? null,
    set(key, readyAt) {
      if (readyAt === null) values.delete(key);
      else values.set(key, readyAt);
    },
  };
}
