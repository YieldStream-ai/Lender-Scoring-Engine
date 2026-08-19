import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@fixtures": resolve(__dirname, "fixtures"),
    },
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
