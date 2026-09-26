import { useSyncExternalStore } from "react";
import type { DropStore } from "../store/dropStore";
import type { SyncStatus } from "../store/sendScheduler";

type WithSyncStatus = DropStore & {
  getSyncStatus?: () => SyncStatus | null;
  getNextSendAt?: () => number | null;
  subscribeSyncStatus?: (onChange: () => void) => () => void;
  saveNow?: () => void;
};

const noSubscription = () => () => {};

export function useSyncStatus(store: DropStore) {
  const withSyncStatus = store as WithSyncStatus;
  const subscribe = withSyncStatus.subscribeSyncStatus ?? noSubscription;
  const status = useSyncExternalStore(subscribe, () => withSyncStatus.getSyncStatus?.() ?? null);
  const nextSendAt = useSyncExternalStore(
    subscribe,
    () => withSyncStatus.getNextSendAt?.() ?? null,
  );
  return { status, nextSendAt, saveNow: () => withSyncStatus.saveNow?.() };
}
