import type { FirebaseApp } from "firebase/app";
import {
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { isDropEntry, type DropEntry, type DropStore } from "./dropStore";
import type { SendScheduler, SyncStatusStore } from "./sendScheduler";

export function createAppFirestore(app: FirebaseApp): Firestore {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export type FirestoreDropStore = DropStore & {
  syncStatus: SyncStatusStore;
  dispose(): void;
};

const TRANSIENT_ERROR_CODES = new Set(["unavailable", "deadline-exceeded", "cancelled"]);

function isTransientError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
}

export function createFirestoreDropStore(
  db: Firestore,
  uid: string,
  scheduler: SendScheduler,
): FirestoreDropStore {
  const cache = new Map<string, DropEntry | null>();
  const pending = new Map<string, DropEntry>();
  const listeners = new Map<string, Set<() => void>>();
  const unwatchers = new Map<string, () => void>();

  const unregister = scheduler.register({
    hasPending: () => pending.size > 0,
    async send() {
      const batch = new Map(pending);
      await Promise.all(
        [...batch].map(([key, entry]) => setDoc(doc(db, "users", uid, "drops", key), entry)),
      );
      batch.forEach((entry, key) => {
        if (pending.get(key) === entry) pending.delete(key);
      });
    },
  });

  function ensureWatched(key: string) {
    if (unwatchers.has(key)) return;
    const unwatch = onSnapshot(
      doc(db, "users", uid, "drops", key),
      (snapshot) => {
        const data = snapshot.data();
        const remote = isDropEntry(data) ? data : null;
        const local = pending.get(key);
        scheduler.setReadFailed(false);
        if (local && (!remote || remote.updatedAt < local.updatedAt)) return;
        if (local) pending.delete(key);
        cache.set(key, remote);
        scheduler.changed();
        listeners.get(key)?.forEach((onChange) => onChange());
      },
      (error) => {
        if (!isTransientError(error)) scheduler.setReadFailed(true);
      },
    );
    unwatchers.set(key, unwatch);
  }

  return {
    get(key) {
      ensureWatched(key);
      return cache.get(key) ?? null;
    },
    set(key, readyAt, updatedAt) {
      const entry = { readyAt, updatedAt };
      cache.set(key, entry);
      pending.set(key, entry);
      listeners.get(key)?.forEach((onChange) => onChange());
      scheduler.changed();
    },
    subscribe(key, onChange) {
      ensureWatched(key);
      const keyListeners = listeners.get(key) ?? new Set<() => void>();
      keyListeners.add(onChange);
      listeners.set(key, keyListeners);
      return () => {
        keyListeners.delete(onChange);
        if (keyListeners.size > 0) return;
        listeners.delete(key);
        unwatchers.get(key)?.();
        unwatchers.delete(key);
      };
    },
    syncStatus: scheduler.syncStatus,
    dispose() {
      unregister();
      unwatchers.forEach((unwatch) => unwatch());
      unwatchers.clear();
      scheduler.dispose();
    },
  };
}
