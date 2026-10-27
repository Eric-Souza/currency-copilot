import { defineConfig, devices } from '@playwright/test'

// The production build against a scripted model, PGlite, and a fake Frankfurter (e2e/services.mjs):
// no API key, network, or Neon needed
const PORT = 3100

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  // The full Chromium build in headless mode, rather than the separate headless shell
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: [
    {
      command: 'node e2e/services.mjs',
      url: 'http://127.0.0.1:8799/health',
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start --port ${PORT}`,
      // / answers with a redirect once the app is up
      url: `http://localhost:${PORT}/`,
      timeout: 240_000,
      reuseExistingServer: false,
      // Set here, these win over .env.local
      env: {
        AI_PROVIDER: 'mock',
        FRANKFURTER_URL: 'http://127.0.0.1:8799/v1',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5439/postgres?sslmode=disable',
      },
    },
  ],
})
