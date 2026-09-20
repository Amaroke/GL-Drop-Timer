import { useEffect, useReducer, useState } from "react";
import type { DropStore } from "./dropStore";

export function useReadyDropTitle(store: DropStore, storageKeys: string[], now: () => number) {
  const [, tick] = useReducer((t: number) => t + 1, 0);
  const [defaultTitle] = useState(() => document.title);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const readyCount = storageKeys.filter((key) => {
    const readyAt = store.get(key);
    return readyAt !== null && readyAt <= now();
  }).length;

  useEffect(() => {
    document.title = readyCount > 0 ? `(${readyCount}) ${defaultTitle}` : defaultTitle;
  }, [readyCount, defaultTitle]);

  useEffect(
    () => () => {
      document.title = defaultTitle;
    },
    [defaultTitle],
  );
}
