import { useSyncExternalStore } from "react";
import type { DropStore } from "../store/dropStore";
import type { SyncStatus } from "../store/firestoreDropStore";

type WithSyncStatus = DropStore & {
  getSyncStatus?: () => SyncStatus | null;
  subscribeSyncStatus?: (onChange: () => void) => () => void;
};

const noSubscription = () => () => {};

export function useSyncStatus(store: DropStore): SyncStatus | null {
  const withSyncStatus = store as WithSyncStatus;
  return useSyncExternalStore(
    withSyncStatus.subscribeSyncStatus ?? noSubscription,
    () => withSyncStatus.getSyncStatus?.() ?? null,
  );
}
