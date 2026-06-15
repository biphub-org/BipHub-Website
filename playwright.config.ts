/**
 * Playwright config — Plan 04-07 (FOUN-10 / D-12 / D-13 / D-14 / D-16).
 *
 * Hard-locked invariants:
 *  - retries: 0 (D-16 — no flake retries in v1; flakes must be fixed, not retried)
 *  - workers: 1 (D-16 single-shard scope)
 *  - fullyParallel: false (fixture users are shared resources; parallelism causes
 *    auth-cookie races between the coordinator-authed and admin-authed projects)
 *  - chromium-only project list (cross-browser deferred to v1.1)
 *  - webServer.env.RESEND_API_KEY: '' forces the D-15 console-log fallback in
 *    lib/email/send.ts so specs can assert email-send via page.on('console')
 */
import { defineConfig, devices } from '@playwright/test'

// Load .env.local so the Playwright test process has the same Supabase env the
// dev server reads — auth.spec.ts calls the Supabase admin API directly via
// process.env.NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. CI injects
// these through $GITHUB_ENV instead, so .env.local is absent there — ignore it.
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local not present (CI) — env comes from the runner environment.
}

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup\.ts$/,
    },
    {
      name: 'auth-flow',
      // Matches only auth.spec.ts (NOT student-auth.spec.ts — the negative
      // lookbehind asserts the char before 'auth' is a path separator, not '-').
      testMatch: /(?:^|[/\\])auth\.spec\.ts$/,
      // auth.spec.ts exercises the real login UI — no storageState reuse.
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'coordinator-authed',
      testMatch: /(submission|resubmit)\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
      },
    },
    {
      name: 'admin-authed',
      testMatch: /admin-review\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/fixtures/storageState.admin.json',
      },
    },
    {
      name: 'public',
      testMatch: /(map-filter|no-horizontal-overflow)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
      // no storageState — public routes
    },
    {
      name: 'student-authed',
      // student-auth.spec.ts manages its own session setup via signInStudent() /
      // the admin generate_link + OTP verify helpers — no pre-established storageState.
      // No dependency on 'setup' (coordinator/admin setup) to avoid ordering entanglement.
      testMatch: /student-auth\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Run the suite against a PRODUCTION build, not `next dev`. `next dev`
    // compiles each route on first hit (multi-second cold-compile), which made
    // first-navigation assertions flaky across the suite (submission wizard,
    // onboarding, the map). A prebuilt `next start` server has every route
    // ready — fast and stable — and is closer to what actually ships.
    command: 'npm run build && npm run start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // E2E mode: blank Resend key triggers console-log fallback (D-15).
      RESEND_API_KEY: '',
      ADMIN_NOTIFICATION_EMAIL: 'e2e-admin@biphub.test',
    },
  },
})
