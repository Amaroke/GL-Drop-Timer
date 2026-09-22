export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
};

export type AuthState =
  | { status: "signed-out" }
  | { status: "signing-in" }
  | { status: "signed-in"; user: AuthUser };

export type AuthService = {
  getState(): AuthState;
  subscribe(onChange: (state: AuthState) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
};

export function createAuthStore(initial: AuthState) {
  let state = initial;
  const listeners = new Set<(state: AuthState) => void>();
  return {
    getState: () => state,
    subscribe(onChange: (state: AuthState) => void) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    setState(next: AuthState) {
      state = next;
      listeners.forEach((listener) => listener(state));
    },
  };
}

export function createMemoryAuthService(
  signIn: () => Promise<AuthUser> = () =>
    Promise.resolve({ uid: "test-user", displayName: "Test Player", email: "player@example.com" }),
): AuthService {
  const store = createAuthStore({ status: "signed-out" });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    async signIn() {
      store.setState({ status: "signing-in" });
      try {
        const user = await signIn();
        store.setState({ status: "signed-in", user });
      } catch {
        store.setState({ status: "signed-out" });
      }
    },
    async signOut() {
      store.setState({ status: "signed-out" });
    },
  };
}
