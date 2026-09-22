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
      <button
        type="button"
        onClick={() => auth.signOut()}
        aria-label={`Signed in as ${label}. Click to sign out.`}
        className={PILL_CLASSES}
      >
        {label}
      </button>
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
