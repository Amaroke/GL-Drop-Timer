import { useSyncExternalStore } from "react";
import type { AuthService } from "./auth";

export function useAuth(auth: AuthService) {
  return useSyncExternalStore(auth.subscribe, auth.getState);
}
