import type { FirebaseApp } from "firebase/app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./components/App.tsx";
import type { AuthService } from "./auth/auth.ts";
import { createFirebaseAuthServiceFromApp, getFirebaseApp } from "./auth/firebaseAuth.ts";
import { readFirebaseConfig } from "./config/firebaseConfig.ts";
import { DROPS } from "./drops.ts";
import { createLocalStorageColonyStore } from "./store/colonyStore.ts";
import { createLocalStorageDropStore, type DropStore } from "./store/dropStore.ts";
import { createAppFirestore } from "./store/firestoreDropStore.ts";
import { createFirestoreSyncedDropStore } from "./store/syncedDropStore.ts";

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
const colonyStore = createLocalStorageColonyStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App store={store} auth={auth} now={Date.now} colonyStore={colonyStore} />
  </StrictMode>,
);
