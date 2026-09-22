import { useEffect, useState } from "react";
import type { DropStore } from "./dropStore";
import { useCountdown } from "./useCountdown";

export function useDropTimer(
  storageKey: string,
  cooldownHours: number,
  store: DropStore,
  now: () => number,
) {
  const [readyAt, setReadyAt] = useState<number | null>(
    () => store.get(storageKey)?.readyAt ?? null,
  );
  const remaining = useCountdown(readyAt, now);
  const isReady = readyAt !== null && remaining === 0;
  const isRunning = readyAt !== null && !isReady;

  useEffect(
    () =>
      store.subscribe(storageKey, () => {
        setReadyAt(store.get(storageKey)?.readyAt ?? null);
      }),
    [storageKey, store],
  );

  const collect = () => {
    const timestamp = now();
    const value = timestamp + cooldownHours * 3600 * 1000;
    setReadyAt(value);
    store.set(storageKey, value, timestamp);
  };

  const reset = () => {
    setReadyAt(null);
    store.set(storageKey, null, now());
  };

  const setManualReadyAt = (timestamp: number) => {
    setReadyAt(timestamp);
    store.set(storageKey, timestamp, now());
  };

  return { readyAt, remaining, isReady, isRunning, collect, reset, setManualReadyAt };
}
