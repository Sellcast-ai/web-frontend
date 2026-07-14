import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      SELLCAST_API_BASE: "http://127.0.0.1:8000/api/v1",
      NEXT_PUBLIC_MEDIA_ORIGIN: "http://127.0.0.1:8000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // server.ts guards against client bundling; irrelevant under vitest.
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only-stub.ts"),
    },
  },
});
