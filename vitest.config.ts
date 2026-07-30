import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" -> "src/*" path alias so tests can import
      // modules the same way the app does.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Unit tests live beside the code they cover, as *.test.ts.
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Coverage targets the pure, unit-testable business logic. Next.js route
      // handlers, React components, the DB client/schema/migrations, and other
      // integration glue require a live database or browser and are exercised by
      // integration/e2e tests instead — including them here would report a
      // misleadingly low number for logic that unit tests deliberately don't own.
      include: [
        "src/lib/carbon/**/*.ts",
        "src/lib/climate/**/*.ts",
        "src/lib/intelligence/climate-alert-rules.ts",
        "src/lib/messaging/**/*.ts",
        "src/lib/auth/device-token.ts",
        "src/lib/validations/telemetry.ts",
        "src/lib/afya-solar/sizing-engine.ts",
      ],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        // server-only modules (DB/network) that live under the included globs
        "src/lib/climate/portfolio-climate-server.ts",
        "src/lib/climate/nasa-power-server.ts",
        "src/lib/climate/facility-climate-persist.ts",
        "src/lib/carbon/apply-carbon-transition.ts",
      ],
      // Enforce the spec's coverage target on the unit-testable logic surface.
      // Currently ~94%; the 80 floor gives margin while failing CI on regressions.
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
