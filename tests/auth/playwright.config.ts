import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_PORT, BASE_URL, DB_PORT, SITE_PORT } from "./support/ports";

const root = path.resolve(__dirname, "../..");

/**
 * End-to-end tests for agent sign-in, invitations, password reset and
 * sessions. Runs the real site (production build) against a local stand-in
 * for Supabase Auth and a throwaway Postgres, so no real accounts or data
 * are touched. Run: npm run test:auth
 *
 * AUTH_TEST_SKIP_BUILD=1 reuses the last test build (faster local reruns).
 */
const siteEnv = {
  NEXT_DIST_DIR: ".next-auth-test",
  NEXT_PUBLIC_LISTINGS_SOURCE: "database",
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${AUTH_PORT}`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  NEXT_PUBLIC_SITE_URL: BASE_URL,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres`,
  DATABASE_POOL_MAX: "3",
  LEAD_IP_SALT: "auth-test-salt",
};

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  // One shared Auth stand-in and database: run tests one at a time
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  outputDir: path.join(root, "test-results"),
  use: {
    baseURL: BASE_URL,
    // The site's CSP has upgrade-insecure-requests, which would send its own
    // scripts to https:// on this plain-http test server
    bypassCSP: true,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/auth/support/mock-auth.mjs",
      cwd: root,
      url: `http://127.0.0.1:${AUTH_PORT}/__health`,
      reuseExistingServer: false,
      env: { MOCK_AUTH_PORT: String(AUTH_PORT) },
    },
    {
      command: "node tests/auth/support/test-db.mjs",
      cwd: root,
      port: DB_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { TEST_DB_PORT: String(DB_PORT) },
    },
    {
      command: `${process.env.AUTH_TEST_SKIP_BUILD ? "" : "npx next build && "}npx next start -p ${SITE_PORT}`,
      cwd: root,
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 420_000,
      env: siteEnv,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
