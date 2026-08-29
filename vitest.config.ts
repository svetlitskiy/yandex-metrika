import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.ts"],
    },
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
