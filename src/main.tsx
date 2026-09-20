import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createLocalStorageDropStore } from "./dropStore.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App store={createLocalStorageDropStore()} now={Date.now} />
  </StrictMode>,
);
