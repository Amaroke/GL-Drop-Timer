import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import type { AuthService } from "./auth";
import {
  createFirestoreDropStore,
  type SyncStatus,
  type SyncStatusStore,
} from "./firestoreDropStore";
import { isDropEntry, type DropStore } from "./dropStore";
import { createNotifier } from "./pubSub";

type KeySubscription = {
  onChange: () => void;
  unsubscribe: () => void;
};

export type SyncedDropStore = DropStore & {
  getSyncStatus(): SyncStatus | null;
  subscribeSyncStatus(onChange: () => void): () => void;
};

function syncStatusOf(store: DropStore): SyncStatusStore | null {
  return (store as DropStore & { syncStatus?: SyncStatusStore }).syncStatus ?? null;
}

export function createSyncedDropStore(deps: {
  auth: AuthService;
  localStore: DropStore;
  createRemoteStore: (uid: string) => DropStore;
  mergeLocalIntoRemote: (uid: string) => Promise<void>;
}): SyncedDropStore {
  const subscriptions = new Map<string, Set<KeySubscription>>();
  const remoteStores = new Map<string, DropStore>();
  const syncStatusNotifier = createNotifier();
  let backing: DropStore = deps.localStore;
  let unwatchSyncStatus: (() => void) | null = null;
  let generation = 0;
  let mergingGeneration: number | null = null;
  let wroteDuringMerge = false;

  function getRemoteStore(uid: string): DropStore {
    let store = remoteStores.get(uid);
    if (!store) {
      store = deps.createRemoteStore(uid);
      remoteStores.set(uid, store);
    }
    return store;
  }

  function watchSyncStatus(next: DropStore) {
    unwatchSyncStatus?.();
    const status = syncStatusOf(next);
    unwatchSyncStatus = status ? status.subscribe(syncStatusNotifier.notify) : null;
  }

  function switchBacking(next: DropStore) {
    if (next === backing) return;
    backing = next;
    watchSyncStatus(next);
    subscriptions.forEach((subs, key) => {
      subs.forEach((sub) => {
        sub.unsubscribe();
        sub.unsubscribe = backing.subscribe(key, sub.onChange);
        sub.onChange();
      });
    });
    syncStatusNotifier.notify();
  }

  async function activateForUid(uid: string, myGeneration: number) {
    let needsAnotherPass = true;
    while (needsAnotherPass) {
      needsAnotherPass = false;
      wroteDuringMerge = false;
      mergingGeneration = myGeneration;
      try {
        await deps.mergeLocalIntoRemote(uid);
      } catch {
        // Best effort: activate the account store with whatever it already has.
      } finally {
        mergingGeneration = null;
      }
      if (myGeneration !== generation) return;
      if (wroteDuringMerge) needsAnotherPass = true;
    }
    switchBacking(getRemoteStore(uid));
  }

  function handleAuthChange() {
    generation += 1;
    const state = deps.auth.getState();
    if (state.status === "signed-in") {
      void activateForUid(state.user.uid, generation);
    } else if (state.status !== "restoring") {
      switchBacking(deps.localStore);
    }
  }

  handleAuthChange();
  deps.auth.subscribe(handleAuthChange);

  return {
    get: (key) => backing.get(key),
    set(key, readyAt, updatedAt) {
      backing.set(key, readyAt, updatedAt);
      if (mergingGeneration === generation) wroteDuringMerge = true;
    },
    subscribe(key, onChange) {
      const sub: KeySubscription = { onChange, unsubscribe: backing.subscribe(key, onChange) };
      const set = subscriptions.get(key) ?? new Set<KeySubscription>();
      set.add(sub);
      subscriptions.set(key, set);
      return () => {
        sub.unsubscribe();
        set.delete(sub);
      };
    },
    getSyncStatus: () => syncStatusOf(backing)?.getStatus() ?? null,
    subscribeSyncStatus: syncStatusNotifier.subscribe,
  };
}

export async function mergeLocalIntoAccount(
  db: Firestore,
  uid: string,
  localStore: DropStore,
  keys: readonly string[],
): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      const local = localStore.get(key);
      if (!local) return;
      const ref = doc(db, "users", uid, "drops", key);
      const snapshot = await getDoc(ref);
      const data = snapshot.data();
      const account = isDropEntry(data) ? data : null;
      if (account && account.updatedAt >= local.updatedAt) return;
      await setDoc(ref, { readyAt: local.readyAt, updatedAt: local.updatedAt });
    }),
  );
}

export function createFirestoreSyncedDropStore(options: {
  auth: AuthService;
  localStore: DropStore;
  db: Firestore;
  keys: readonly string[];
}): SyncedDropStore {
  return createSyncedDropStore({
    auth: options.auth,
    localStore: options.localStore,
    createRemoteStore: (uid) => createFirestoreDropStore(options.db, uid),
    mergeLocalIntoRemote: (uid) =>
      mergeLocalIntoAccount(options.db, uid, options.localStore, options.keys),
  });
}
