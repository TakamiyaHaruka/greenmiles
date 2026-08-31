import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// E2E runs against a production build on its own port (3100) with an
// isolated SQLite database, so a dev server on :3000 is never reused
// or disturbed. The database is reset before every run (see
// e2e/reset-db.mjs wired into webServer.command) and re-seeded on boot.
const E2E_DB = path.join('e2e', 'greenmiles-e2e.db');
const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node e2e/reset-db.mjs && npm run build && npm run start',
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      PORT: String(PORT),
      JWT_SECRET: 'e2e-test-secret',
      DATABASE_PATH: E2E_DB,
      // The admin e2e journeys log in via /api/admin/login, which 503s
      // without a configured password
      ADMIN_PASSWORD: 'e2e-admin-secret',
    },
  },
});
