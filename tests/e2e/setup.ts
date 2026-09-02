/**
 * Storage-state setup project (Plan 04-07 / D-13).
 *
 * Signs each of the three fixture users in via the REAL login UI ONCE per
 * test run, then persists the browser context's cookies + localStorage to
 * tests/e2e/fixtures/storageState.<name>.json. Authenticated spec projects
 * (coordinator-authed, admin-authed in playwright.config.ts) reuse these
 * files via `use.storageState` so they skip the login UI.
 *
 * Hard contract — DO NOT bypass the UI sign-in here. The setup project is
 * the implicit contract validation of "the login form works"; if it
 * breaks the entire suite goes red and the bug surfaces before any
 * feature spec runs.
 *
 * Storage state JSONs are gitignored — the local Supabase JWT signing
 * keys regenerate on every `supabase start`, so cached state from one
 * boot is invalid on the next. The setup project regenerates them on
 * every `npm run test:e2e` invocation; CI does the same.
 */
import { test as setup, type Page } from '@playwright/test'

interface FixtureUser {
  email: string
  password: string
  file: string
}

const FIXTURES: Record<'coordinator' | 'coordinatorFresh' | 'admin', FixtureUser> = {
  coordinator: {
    email: 'e2e-coordinator@biphub.test',
    password: 'Coordinator!Test1',
    file: 'tests/e2e/fixtures/storageState.coordinator.json',
  },
  coordinatorFresh: {
    email: 'e2e-coordinator-fresh@biphub.test',
    password: 'Fresh!Test1',
    file: 'tests/e2e/fixtures/storageState.coordinator-fresh.json',
  },
  admin: {
    email: 'e2e-admin@biphub.test',
    password: 'Admin!Test1',
    file: 'tests/e2e/fixtures/storageState.admin.json',
  },
}

async function signInAndPersist(page: Page, user: FixtureUser): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(user.email)
  await page.getByRole('button', { name: /continue/i }).click()
  // Two-step login: email -> password step
  await page.getByLabel(/password/i).fill(user.password)
  await page.getByRole('button', { name: /sign in/i }).click()
  // Coordinator → /dashboard; fresh coordinator → /onboarding;
  // admin → /admin. Permissive URL wait absorbs all three.
  await page.waitForURL(/\/(dashboard|onboarding|admin)/, { timeout: 15_000 })
  await page.context().storageState({ path: user.file })
}

setup('coordinator session', async ({ page }) => {
  await signInAndPersist(page, FIXTURES.coordinator)
})

setup('coordinator-fresh session', async ({ page }) => {
  await signInAndPersist(page, FIXTURES.coordinatorFresh)
})

setup('admin session', async ({ page }) => {
  await signInAndPersist(page, FIXTURES.admin)
})
