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

export function createAppFirestore(app: FirebaseApp): Firestore {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export function createFirestoreDropStore(db: Firestore, uid: string): DropStore {
  const cache = new Map<string, DropEntry | null>();
  const listeners = new Map<string, Set<() => void>>();
  const unwatchers = new Map<string, () => void>();

  function ensureWatched(key: string) {
    if (unwatchers.has(key)) return;
    const unwatch = onSnapshot(
      doc(db, "users", uid, "drops", key),
      (snapshot) => {
        const data = snapshot.data();
        cache.set(key, isDropEntry(data) ? data : null);
        listeners.get(key)?.forEach((onChange) => onChange());
      },
      () => {
        // Best effort: a dead listener leaves the last known cache value in place.
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
      cache.set(key, { readyAt, updatedAt });
      listeners.get(key)?.forEach((onChange) => onChange());
      void setDoc(doc(db, "users", uid, "drops", key), { readyAt, updatedAt }).catch(() => {
        // Best effort: the next snapshot reconciles with the real server state.
      });
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
  };
}
