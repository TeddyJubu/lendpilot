/**
 * @organ core
 * @tissue tests
 * @description Vitest configuration for the Next.js web app.
 *   Keeps setup minimal for Foundation scaffolding.
 * @depends-on
 *   - vitest
 * @depended-by
 *   - package.json scripts (pnpm test)
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    passWithNoTests: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
