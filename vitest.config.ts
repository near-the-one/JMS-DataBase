/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentMatchGlobs: [
      ["src/__tests__/phase7-completion-lint.test.ts", "node"],
    ],
    setupFiles: ["./src/__tests__/preload-esbuild-fix.ts", "./src/test-setup.ts"],
    css: true,
    testTimeout: 15000,
  },
});