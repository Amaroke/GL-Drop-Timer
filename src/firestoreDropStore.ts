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
import { createNotifier } from "./pubSub";

export function createAppFirestore(app: FirebaseApp): Firestore {
  return initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

export type SyncStatusStore = {
  getStatus(): SyncStatus;
  subscribe(onChange: () => void): () => void;
};

export type FirestoreDropStore = DropStore & { syncStatus: SyncStatusStore };

const TRANSIENT_ERROR_CODES = new Set(["unavailable", "deadline-exceeded", "cancelled"]);

function isTransientError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code !== undefined && TRANSIENT_ERROR_CODES.has(code);
}

function createOnlineWatcher() {
  let isOnline = typeof navigator?.onLine === "boolean" ? navigator.onLine : true;
  const notifier = createNotifier<boolean>();
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      isOnline = true;
      notifier.notify(true);
    });
    window.addEventListener("offline", () => {
      isOnline = false;
      notifier.notify(false);
    });
  }
  return {
    getIsOnline: () => isOnline,
    subscribe: notifier.subscribe,
  };
}

const onlineWatcher = createOnlineWatcher();

export function createFirestoreDropStore(db: Firestore, uid: string): FirestoreDropStore {
  const cache = new Map<string, DropEntry | null>();
  const listeners = new Map<string, Set<() => void>>();
  const unwatchers = new Map<string, () => void>();

  let pendingWrites = 0;
  let hasError = false;
  let isOnline = onlineWatcher.getIsOnline();
  const statusNotifier = createNotifier();

  function computeStatus(): SyncStatus {
    if (!isOnline) return "offline";
    if (hasError) return "error";
    if (pendingWrites > 0) return "syncing";
    return "synced";
  }

  let status = computeStatus();
  function notifyStatus() {
    const next = computeStatus();
    if (next === status) return;
    status = next;
    statusNotifier.notify();
  }

  onlineWatcher.subscribe((online) => {
    isOnline = online;
    notifyStatus();
  });

  function ensureWatched(key: string) {
    if (unwatchers.has(key)) return;
    const unwatch = onSnapshot(
      doc(db, "users", uid, "drops", key),
      (snapshot) => {
        const data = snapshot.data();
        cache.set(key, isDropEntry(data) ? data : null);
        hasError = false;
        notifyStatus();
        listeners.get(key)?.forEach((onChange) => onChange());
      },
      (error) => {
        if (!isTransientError(error)) {
          hasError = true;
          notifyStatus();
        }
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
      pendingWrites += 1;
      notifyStatus();
      setDoc(doc(db, "users", uid, "drops", key), { readyAt, updatedAt })
        .then(() => {
          hasError = false;
        })
        .catch((error: unknown) => {
          if (!isTransientError(error)) hasError = true;
        })
        .finally(() => {
          pendingWrites -= 1;
          notifyStatus();
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
    syncStatus: {
      getStatus: () => status,
      subscribe: statusNotifier.subscribe,
    },
  };
}
