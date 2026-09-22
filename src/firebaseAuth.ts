import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  type Auth,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { createAuthStore, type AuthService, type AuthUser } from "./auth";

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, displayName: user.displayName, email: user.email };
}

function createLiveAuthService(auth: Auth): AuthService {
  const provider = new GoogleAuthProvider();
  const store = createAuthStore({ status: "signed-out" });

  onAuthStateChanged(auth, (user) => {
    store.setState(
      user ? { status: "signed-in", user: toAuthUser(user) } : { status: "signed-out" },
    );
  });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    async signIn() {
      store.setState({ status: "signing-in" });
      try {
        await signInWithPopup(auth, provider);
      } catch {
        if (store.getState().status === "signing-in") store.setState({ status: "signed-out" });
      }
    },
    async signOut() {
      try {
        await firebaseSignOut(auth);
      } catch {
        // Best effort: onAuthStateChanged reflects the real outcome either way.
      }
    },
  };
}

function createUnavailableAuthService(): AuthService {
  const store = createAuthStore({ status: "signed-out" });

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    async signIn() {},
    async signOut() {},
  };
}

export function createFirebaseAuthService(config: FirebaseOptions): AuthService {
  try {
    const app = getApps().length ? getApp() : initializeApp(config);
    return createLiveAuthService(getAuth(app));
  } catch {
    return createUnavailableAuthService();
  }
}
