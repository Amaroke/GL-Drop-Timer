import type { AuthService } from "./auth";
import { PILL_BASE_CLASSES } from "./pillStyles";
import { useAuth } from "./useAuth";

type AccountControlProps = {
  auth: AuthService;
};

const PILL_CLASSES = `${PILL_BASE_CLASSES} text-white transition-colors hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50`;

export function AccountControl({ auth }: AccountControlProps) {
  const state = useAuth(auth);

  if (state.status === "signed-in") {
    const label = state.user.displayName || state.user.email || "your account";
    return (
      <div className="flex min-w-0 items-center overflow-hidden rounded-full border border-white/10 bg-white/6 text-xs font-medium text-white">
        <span className="max-w-32 truncate py-2 pr-2 pl-3.5">{label}</span>
        <span className="w-px flex-shrink-0 self-stretch bg-white/15" aria-hidden="true" />
        <button
          type="button"
          onClick={() => auth.signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="flex flex-shrink-0 items-center self-stretch pr-3.5 pl-4 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
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
