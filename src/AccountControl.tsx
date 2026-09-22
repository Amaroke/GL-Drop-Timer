import type { AuthService } from "./auth";
import { IconPopover } from "./IconPopover";
import { useAuth } from "./useAuth";

type AccountControlProps = {
  auth: AuthService;
};

const ACCOUNT_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

export function AccountControl({ auth }: AccountControlProps) {
  const state = useAuth(auth);

  return (
    <IconPopover label="Account" align="right" icon={ACCOUNT_ICON}>
      {state.status === "signed-in" ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-white/50">
            Signed in as {state.user.displayName || state.user.email || "your account"}
          </span>
          <button
            type="button"
            onClick={() => auth.signOut()}
            className="rounded-xl bg-white/8 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/15"
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => auth.signIn()}
          disabled={state.status === "signing-in"}
          className="w-full rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.status === "signing-in" ? "Signing in…" : "Sign in with Google"}
        </button>
      )}
    </IconPopover>
  );
}
