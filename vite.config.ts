import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  base: "/GL-Drop-Timer/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude, "**/*.emulator.test.ts"],
  },
});
