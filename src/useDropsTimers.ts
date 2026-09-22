import { useEffect, useState } from "react";
import type { DropStore } from "./dropStore";

type DropDefinition = {
  storageKey: string;
  cooldownHours: number;
};

export type DropTimerState = {
  readyAt: number | null;
  remaining: number | null;
  isReady: boolean;
  isRunning: boolean;
  collect: () => void;
  reset: () => void;
  setManualReadyAt: (timestamp: number) => void;
};

export function useDropsTimers(
  drops: DropDefinition[],
  store: DropStore,
  now: () => number,
): Record<string, DropTimerState> {
  const [readyAtByKey, setReadyAtByKey] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(
      drops.map((drop) => [drop.storageKey, store.get(drop.storageKey)?.readyAt ?? null]),
    ),
  );
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsubscribes = drops.map((drop) =>
      store.subscribe(drop.storageKey, () => {
        setReadyAtByKey((previous) => ({
          ...previous,
          [drop.storageKey]: store.get(drop.storageKey)?.readyAt ?? null,
        }));
      }),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  useEffect(() => {
    const id = setInterval(() => forceTick((tick) => tick + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const setReadyAt = (storageKey: string, readyAt: number | null) => {
    setReadyAtByKey((previous) => ({ ...previous, [storageKey]: readyAt }));
  };

  const states: Record<string, DropTimerState> = {};
  for (const drop of drops) {
    const readyAt = readyAtByKey[drop.storageKey] ?? null;
    const remaining = readyAt === null ? null : Math.max(0, readyAt - now());
    const isReady = readyAt !== null && remaining === 0;
    const isRunning = readyAt !== null && !isReady;

    states[drop.storageKey] = {
      readyAt,
      remaining,
      isReady,
      isRunning,
      collect: () => {
        const timestamp = now();
        const value = timestamp + drop.cooldownHours * 3600 * 1000;
        setReadyAt(drop.storageKey, value);
        store.set(drop.storageKey, value, timestamp);
      },
      reset: () => {
        setReadyAt(drop.storageKey, null);
        store.set(drop.storageKey, null, now());
      },
      setManualReadyAt: (timestamp: number) => {
        setReadyAt(drop.storageKey, timestamp);
        store.set(drop.storageKey, timestamp, now());
      },
    };
  }

  return states;
}
