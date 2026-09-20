import { useCallback, useEffect, useRef, useState } from "react";
import type { DropStore } from "./dropStore";

type NotifiableDrop = {
  storageKey: string;
  name: string;
};

export type NotificationPermissionState = NotificationPermission | "unsupported";

function readPermission(): NotificationPermissionState {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

export function useReadyNotifications(
  drops: NotifiableDrop[],
  store: DropStore,
  now: () => number,
) {
  const [permission, setPermission] = useState(readPermission);
  const wasRunning = useRef<Map<string, boolean>>(new Map());

  const isRunning = useCallback(
    (storageKey: string) => {
      const readyAt = store.get(storageKey);
      return readyAt !== null && readyAt > now();
    },
    [store, now],
  );

  useEffect(() => {
    for (const drop of drops) wasRunning.current.set(drop.storageKey, isRunning(drop.storageKey));

    const id = setInterval(() => {
      for (const drop of drops) {
        const running = isRunning(drop.storageKey);
        const justBecameReady = wasRunning.current.get(drop.storageKey) === true && !running;
        wasRunning.current.set(drop.storageKey, running);
        if (justBecameReady && readPermission() === "granted") {
          new Notification(`${drop.name} is ready`, {
            body: `Your ${drop.name} can be collected.`,
            tag: drop.storageKey,
          });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [drops, isRunning]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    await Notification.requestPermission();
    setPermission(readPermission());
  }, []);

  return { permission, requestPermission };
}
