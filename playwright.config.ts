import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

// Test credentials live in a gitignored e2e/.env.test (never committed).
// override:true so the file's values win even if a stale var is already set.
loadEnv({ path: path.resolve(__dirname, 'e2e/.env.test'), override: true })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
  },
  projects: [
    // Separate per-role login setups so one role's login failure doesn't skip
    // the other role's dashboard specs.
    { name: 'setup-admin', testMatch: /admin\.setup\.ts/ },
    { name: 'setup-facility', testMatch: /facility\.setup\.ts/ },
    {
      name: 'public',
      testMatch: /public\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      dependencies: ['setup-admin'],
      testMatch: /admin-dashboard\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
    },
    {
      name: 'facility',
      dependencies: ['setup-facility'],
      testMatch: /facility-dashboard\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/facility.json' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
