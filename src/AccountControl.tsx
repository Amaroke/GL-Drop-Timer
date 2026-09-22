import type { AuthService } from "./auth";
import type { DropStore } from "./dropStore";
import type { SyncStatus } from "./firestoreDropStore";
import { PILL_BASE_CLASSES } from "./pillStyles";
import { useAuth } from "./useAuth";
import { useSyncStatus } from "./useSyncStatus";

type AccountControlProps = {
  auth: AuthService;
  store: DropStore;
};

const PILL_CLASSES = `${PILL_BASE_CLASSES} text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50`;

const SYNC_STATUS_PRESENTATION: Record<
  Exclude<SyncStatus, "synced">,
  { label: string; dotClass: string }
> = {
  syncing: { label: "Syncing…", dotClass: "bg-sky-400 animate-pulse" },
  offline: {
    label: "Offline — changes will sync once you're back online",
    dotClass: "bg-white/40",
  },
  error: { label: "Sync failed", dotClass: "bg-red-400" },
};

function SyncStatusDot({ status }: { status: SyncStatus }) {
  if (status === "synced") return null;
  const { label, dotClass } = SYNC_STATUS_PRESENTATION[status];
  return (
    <span
      role="status"
      title={label}
      aria-label={label}
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
    />
  );
}

export function AccountControl({ auth, store }: AccountControlProps) {
  const state = useAuth(auth);
  const syncStatus = useSyncStatus(store);

  if (state.status === "restoring") return null;

  if (state.status === "signed-in") {
    const label = state.user.displayName || state.user.email || "your account";
    return (
      <div className="flex min-w-0 items-center overflow-hidden rounded-full border border-white/10 bg-white/6 text-xs font-medium text-white">
        <span className="flex min-w-0 items-center gap-1.5 py-2 pr-2 pl-3.5">
          <span className="max-w-32 truncate">{label}</span>
          {syncStatus && <SyncStatusDot status={syncStatus} />}
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
