import type { FirebaseApp } from "firebase/app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import type { AuthService } from "./auth.ts";
import { DROPS } from "./drops.ts";
import { createLocalStorageDropStore, type DropStore } from "./dropStore.ts";
import { createFirebaseAuthServiceFromApp, getFirebaseApp } from "./firebaseAuth.ts";
import { readFirebaseConfig } from "./firebaseConfig.ts";
import { createAppFirestore } from "./firestoreDropStore.ts";
import { createFirestoreSyncedDropStore } from "./syncedDropStore.ts";

function createStore(app: FirebaseApp | null, auth: AuthService, localStore: DropStore): DropStore {
  if (!app) return localStore;
  try {
    return createFirestoreSyncedDropStore({
      auth,
      localStore,
      db: createAppFirestore(app),
      keys: DROPS.map((drop) => drop.storageKey),
    });
  } catch {
    return localStore;
  }
}

const app = getFirebaseApp(readFirebaseConfig());
const auth = createFirebaseAuthServiceFromApp(app);
const store = createStore(app, auth, createLocalStorageDropStore());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App store={store} auth={auth} now={Date.now} />
  </StrictMode>,
);
