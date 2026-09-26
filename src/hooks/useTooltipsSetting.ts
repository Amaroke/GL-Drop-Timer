import { createContext, useState } from "react";

const STORAGE_KEY = "showTooltips";

export const TooltipsEnabledContext = createContext(true);

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function useTooltipsSetting(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(readStored);

  function update(next: boolean) {
    setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      return;
    }
  }

  return [enabled, update];
}
