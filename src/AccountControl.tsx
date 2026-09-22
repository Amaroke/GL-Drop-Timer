import type { AuthService } from "./auth";
import { useAuth } from "./useAuth";

type AccountControlProps = {
  auth: AuthService;
};

export function AccountControl({ auth }: AccountControlProps) {
  const state = useAuth(auth);

  if (state.status === "signed-in") {
    const label = state.user.displayName || state.user.email || "your account";
    return (
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <span className="text-white/50">Signed in as {label}</span>
        <button
          type="button"
          onClick={() => auth.signOut()}
          className="rounded-xl bg-white/8 px-3 py-1.5 font-medium text-white transition-colors hover:bg-white/15"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => auth.signIn()}
      disabled={state.status === "signing-in"}
      className="mt-4 rounded-xl bg-white/8 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {state.status === "signing-in" ? "Signing in…" : "Sign in with Google"}
    </button>
  );
}
