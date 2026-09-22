import { useCallback, useEffect, useRef, useState } from "react";
import type { DropStore } from "../store/dropStore";

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
  const lastState = useRef<Map<string, "idle" | "running" | "ready">>(new Map());

  const readState = useCallback(
    (storageKey: string) => {
      const readyAt = store.get(storageKey)?.readyAt ?? null;
      if (readyAt === null) return "idle";
      return readyAt > now() ? "running" : "ready";
    },
    [store, now],
  );

  useEffect(() => {
    for (const drop of drops) lastState.current.set(drop.storageKey, readState(drop.storageKey));

    const id = setInterval(() => {
      for (const drop of drops) {
        const state = readState(drop.storageKey);
        const justBecameReady =
          lastState.current.get(drop.storageKey) === "running" && state === "ready";
        lastState.current.set(drop.storageKey, state);
        if (justBecameReady && readPermission() === "granted") {
          try {
            new Notification(`${drop.name} is ready`, {
              body: `Your ${drop.name} can be collected.`,
              tag: drop.storageKey,
            });
          } catch {
            continue;
          }
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [drops, readState]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    try {
      await Notification.requestPermission();
    } catch {
      return readPermission();
    }
    const result = readPermission();
    setPermission(result);
    return result;
  }, []);

  return { permission, requestPermission };
}
