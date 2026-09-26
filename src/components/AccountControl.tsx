import type { AuthService } from "../auth/auth";
import { useAuth } from "../auth/useAuth";
import { PILL_BASE_CLASSES } from "../config/pillStyles";
import { useSyncStatus } from "../hooks/useSyncStatus";
import type { DropStore } from "../store/dropStore";
import { formatClockTime } from "../lib/dateFormat";
import type { SyncStatus } from "../store/sendScheduler";

type AccountControlProps = {
  auth: AuthService;
  store: DropStore;
};

const PILL_CLASSES = `${PILL_BASE_CLASSES} text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50`;

const DOT_CLASSES: Record<SyncStatus, string> = {
  synced: "bg-emerald-400",
  sending: "bg-amber-400 animate-pulse",
  pending: "bg-red-400",
  offline: "bg-red-400",
  error: "bg-red-400",
};

function syncLabel(status: SyncStatus, nextSendAt: number | null): string {
  const next = nextSendAt === null ? null : formatClockTime(nextSendAt);
  switch (status) {
    case "synced":
      return "Synced";
    case "sending":
      return "Sending…";
    case "pending":
      return next ? `Not synced yet, next send at ${next}` : "Not synced yet";
    case "offline":
      return "Offline, changes will be sent once you're back online";
    case "error":
      return next ? `Sync failed, next attempt at ${next}` : "Sync failed";
  }
}

function SyncStatusDot({ status, label }: { status: SyncStatus; label: string }) {
  return (
    <span
      role="status"
      title={label}
      aria-label={label}
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[status]}`}
    />
  );
}

export function AccountControl({ auth, store }: AccountControlProps) {
  const state = useAuth(auth);
  const { status: syncStatus, nextSendAt, saveNow } = useSyncStatus(store);

  if (state.status === "restoring") return null;

  if (state.status === "signed-in") {
    const label = state.user.displayName || state.user.email || "your account";
    return (
      <div className="flex min-w-0 items-center overflow-hidden rounded-full border border-white/10 bg-white/6 text-xs font-medium text-white">
        <span className="flex min-w-0 items-center gap-1.5 py-2 pr-2 pl-3.5">
          <span className="max-w-32 truncate">{label}</span>
          {syncStatus && (
            <SyncStatusDot status={syncStatus} label={syncLabel(syncStatus, nextSendAt)} />
          )}
          {syncStatus && !["synced", "sending"].includes(syncStatus) && (
            <button
              type="button"
              onClick={saveNow}
              className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              Save now
            </button>
          )}
        </span>
        <span className="w-px shrink-0 self-stretch bg-white/15" aria-hidden="true" />
        <button
          type="button"
          onClick={() => auth.signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="flex shrink-0 items-center self-stretch pr-3.5 pl-4 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => auth.signIn()}
      disabled={state.status === "signing-in"}
      className={PILL_CLASSES}
    >
      {state.status === "signing-in" ? "Signing in…" : "Sign in with Google"}
    </button>
  );
}
