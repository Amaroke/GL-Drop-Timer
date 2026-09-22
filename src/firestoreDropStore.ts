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
import type { DropEntry, DropStore } from "./dropStore";

function isDropEntry(value: unknown): value is DropEntry {
  if (typeof value !== "object" || value === null) return false;
  const { readyAt, updatedAt } = value as Record<string, unknown>;
  const hasValidReadyAt =
    readyAt === null || (typeof readyAt === "number" && Number.isFinite(readyAt));
  const hasValidUpdatedAt = typeof updatedAt === "number" && Number.isFinite(updatedAt);
  return hasValidReadyAt && hasValidUpdatedAt;
}

export function createAppFirestore(app: FirebaseApp): Firestore {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export function createFirestoreDropStore(db: Firestore, uid: string): DropStore {
  const cache = new Map<string, DropEntry | null>();
  const listeners = new Map<string, Set<() => void>>();
  const subscribed = new Set<string>();

  function ensureWatched(key: string) {
    if (subscribed.has(key)) return;
    subscribed.add(key);
    onSnapshot(doc(db, "users", uid, "drops", key), (snapshot) => {
      const data = snapshot.data();
      cache.set(key, isDropEntry(data) ? data : null);
      listeners.get(key)?.forEach((onChange) => onChange());
    });
  }

  return {
    get(key) {
      ensureWatched(key);
      return cache.get(key) ?? null;
    },
    set(key, readyAt, updatedAt) {
      void setDoc(doc(db, "users", uid, "drops", key), { readyAt, updatedAt });
    },
    subscribe(key, onChange) {
      ensureWatched(key);
      const keyListeners = listeners.get(key) ?? new Set<() => void>();
      keyListeners.add(onChange);
      listeners.set(key, keyListeners);
      return () => keyListeners.delete(onChange);
    },
  };
}
