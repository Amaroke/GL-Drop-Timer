import type { Firestore } from "firebase/firestore";
import { isDropEntry, type DropEntry, type DropStore } from "./dropStore";
import { createFirestoreDocumentStore } from "./firestoreDocumentStore";
import type { SendScheduler, SyncStatusStore } from "./sendScheduler";

export type FirestoreDropStore = DropStore & {
  syncStatus: SyncStatusStore;
  dispose(): void;
};

export function createFirestoreDropStore(
  db: Firestore,
  uid: string,
  scheduler: SendScheduler,
): FirestoreDropStore {
  const store = createFirestoreDocumentStore<DropEntry>(
    db,
    uid,
    "drops",
    {
      fromDocument: (data) => (isDropEntry(data) ? data : null),
      toDocument: (entry) => entry,
    },
    scheduler,
  );
  return {
    ...store,
    set: (key, readyAt, updatedAt) => store.set(key, { readyAt, updatedAt }),
  };
}
