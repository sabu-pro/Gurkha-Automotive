import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // PGlite boots a real Postgres in WebAssembly; give it room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
