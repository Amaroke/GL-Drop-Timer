import type { Firestore } from "firebase/firestore";
import { toColonyEntry, type ColonyEntry, type ColonyStore } from "./colonyStore";
import { createFirestoreDocumentStore } from "./firestoreDocumentStore";
import type { SendScheduler, SyncStatusStore } from "./sendScheduler";

export type FirestoreColonyStore = ColonyStore & {
  syncStatus: SyncStatusStore;
  dispose(): void;
};

function fromDocument(data: unknown): ColonyEntry | null {
  if (typeof data !== "object" || data === null) return null;
  const { starBase, buildings, updatedAt } = data as Record<string, unknown>;
  return toColonyEntry({ starBaseLevel: starBase, buildings, updatedAt });
}

export function createFirestoreColonyStore(
  db: Firestore,
  uid: string,
  scheduler: SendScheduler,
): FirestoreColonyStore {
  return createFirestoreDocumentStore<ColonyEntry>(
    db,
    uid,
    "colonies",
    {
      fromDocument,
      toDocument: ({ starBaseLevel, buildings, updatedAt }) => ({
        starBase: starBaseLevel,
        buildings,
        updatedAt,
      }),
    },
    scheduler,
  );
}
