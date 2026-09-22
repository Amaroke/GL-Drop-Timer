import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createLocalStorageDropStore } from "./dropStore.ts";
import { createFirebaseAuthService } from "./firebaseAuth.ts";
import { readFirebaseConfig } from "./firebaseConfig.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      store={createLocalStorageDropStore()}
      auth={createFirebaseAuthService(readFirebaseConfig())}
      now={Date.now}
    />
  </StrictMode>,
);
