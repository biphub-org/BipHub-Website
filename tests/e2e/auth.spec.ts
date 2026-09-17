/**
 * Auth golden-path spec — Plan 04-07 Task 4 (D-14 auth scope + FOUN-07 verify).
 *
 * Covers:
 *   1. Coordinator access request through the UI → under-review confirmation
 *      → re-entering the email on /login shows "under review"
 *   2. Invalid credentials show an inline error
 *   3. Logout from /dashboard via the sign-out form
 *   4. Password reset request shows the "check your email" confirmation
 *   5. Account deletion via /dashboard/settings (self-provisions its own
 *      throwaway coordinator via the admin API, so it is fully re-runnable)
 *
 * Coordinators no longer self-register: /register/coordinator is an access
 * request reviewed by admins (approve → invite email → set password).
 *
 * Selectors use the semantic Playwright API (getByLabel / getByRole /
 * getByText) — no className targeting — so the suite is resilient to
 * Tailwind refactors.
 *
 * RESEND_API_KEY is intentionally blank in playwright.config.ts; the
 * reset-password test asserts the UI confirmation page only (real link
 * extraction deferred to v1.1 per EDGE-CASES-DEFERRED.md).
 */
import { test, expect } from '@playwright/test'

test.describe('auth flow', () => {
  const NEW_USER = {
    email: `e2e-throwaway-${Date.now()}@biphub.test`,
    password: 'Throwaway!Test1',
  }

  test('coordinator request → under review → login shows review status', async ({
    page,
  }) => {
    // 1. File an access request through the UI (/register is a chooser —
    // the request form lives on /register/coordinator).
    await page.goto('/register/coordinator')
    await page.getByLabel(/account email/i).fill(NEW_USER.email)
    await page.getByLabel(/full name/i).fill('E2E Throwaway Coordinator')
    await page.getByLabel(/contact email/i).fill(NEW_USER.email)
    // University combobox: search then pick the first registry result
    // (seed data has registered universities). Matched by visible text: role="combobox" takes its accessible name from the author, not contents, so the trigger has an empty accessible name and a name filter never matches; the Country <select> on the same form rules out the bare role locator.
    await page
      .getByText(/search by name or erasmus/i)
      .click()
    await page
      .getByPlaceholder(/search by name or erasmus code/i)
      .fill('Uni')
    // Scoped to the results listbox: the Country <select>'s native <option> elements also expose role="option".
    await page
      .getByRole('listbox')
      .getByRole('option')
      .first()
      .click({ timeout: 10_000 })
    // Country + erasmus code auto-fill from the chosen university; fill the
    // code explicitly in case the seed row has none.
    await page.getByLabel(/erasmus code/i).fill('E2E TST01')
    await page.getByRole('button', { name: /submit request/i }).click()
    await expect(
      page.getByRole('heading', { name: /request received/i }),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/under review/i).first()).toBeVisible()

    // 2. No account exists yet: entering the same email on /login must
    // explain the review state instead of offering a password field.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(NEW_USER.email)
    await page.getByRole('button', { name: /continue/i }).click()
    await expect(page.getByText(/under review/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('not-a-real-user@biphub.test')
    await page.getByRole('button', { name: /continue/i }).click()
    // Two-step login: an email with no account lands on the 'No account
    // found' screen — there is no password step to show an error on.
    await expect(page.getByText(/no account found/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('login no-account screen passes the email to registration', async ({ page }) => {
    const email = `e2e-prefill-${Date.now()}@biphub.test`
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /continue/i }).click()
    // Unknown email → no-account screen; the student path carries ?email=.
    await page.getByRole('link', { name: /create student account/i }).click()
    await page.waitForURL(/\/register\/student\?email=/, { timeout: 10_000 })
    await expect(page.getByLabel(/email/i)).toHaveValue(email)
  })

  test('logout from /dashboard', async ({ page }) => {
    // Login as the fixture coordinator.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('e2e-coordinator@biphub.test')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByLabel(/password/i).fill('Coordinator!Test1')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })

    // DashboardNav renders a <form action={signOutAction}> with a "Sign out" button.
    await page.getByRole('button', { name: /sign out/i }).click()
    // signOutAction redirects to /login.
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })

  test('password reset request shows confirmation', async ({ page }) => {
    await page.goto('/reset-password')
    await page.getByLabel(/email/i).fill('e2e-coordinator@biphub.test')
    await page.getByRole('button', { name: /send reset link/i }).click()
    // Form replaced with "Check your email" card; success regardless of
    // whether the email exists (T-02-02-05 no-enumeration).
    // Scope to the heading — /check your email/i also matches the body copy
    // ("Check your email for a reset link…"), which trips Playwright strict mode.
    await expect(
      page.getByRole('heading', { name: /check your email/i }),
    ).toBeVisible({ timeout: 5_000 })
    // D-15 console-log fallback fires server-side; real link extraction
    // deferred (see tests/e2e/EDGE-CASES-DEFERRED.md).
  })

  // Self-provisioning: this test creates its OWN throwaway coordinator via the
  // admin API (with a pre-completed profile inserted via service-role) and
  // deletes it. That makes it fully re-runnable — it no longer destructively
  // consumes the shared e2e-coordinator-fresh seed fixture, so a second run in
  // the same DB state can't fail for lack of a fresh user. Pattern mirrors the
  // throwaway-student setup in saved-bips.spec.ts (Plan 06-04 D-throwaway).
  test('account deletion via /dashboard/settings (self-provisioned coordinator)', async ({
    page,
  }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }
    const adminHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    }
    const accountEmail = `e2e-delete-coordinator-throwaway-${Date.now()}@biphub.test`
    const accountPassword = 'Throwaway!Test1'

    // Step 1: create the throwaway coordinator via the admin API.
    const createResp = await page.request.post(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: adminHeaders,
      data: {
        email: accountEmail,
        password: accountPassword,
        email_confirm: true,
        app_metadata: { role: 'coordinator' },
        user_metadata: { role: 'coordinator' },
      },
    })
    expect(createResp.ok()).toBeTruthy()
    const throwawayUserId: string = (await createResp.json()).id
    expect(throwawayUserId).toBeTruthy()

    // Step 2: resolve the demo host university (D MUNCHEN02, from supabase/seed.sql)
    // so the profile can carry a real university_id.
    const uniResp = await page.request.get(
      `${supabaseUrl}/rest/v1/universities?erasmus_code=eq.D%20MUNCHEN02&select=id`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    )
    expect(uniResp.ok()).toBeTruthy()
    const unis = await uniResp.json()
    expect(Array.isArray(unis) && unis.length > 0).toBeTruthy()
    const universityId: string = unis[0].id

    // Step 3: complete the profile via service-role (RLS bypass for setup) so the
    // (dashboard) layout profile-complete gate passes — full_name && university_id
    // && contact_email && erasmus_code — letting us reach /dashboard/settings
    // directly, without driving the onboarding UI.
    const profResp = await page.request.post(`${supabaseUrl}/rest/v1/profiles`, {
      headers: { ...adminHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
      data: {
        id: throwawayUserId,
        full_name: 'E2E Delete Coordinator',
        contact_email: accountEmail,
        university_id: universityId,
        erasmus_code: 'TEST DEL01',
        role: 'coordinator',
      },
    })
    expect(profResp.ok()).toBeTruthy()

    // Step 4: sign in through the real login UI. Complete profile → /dashboard.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(accountEmail)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.getByLabel(/password/i).fill(accountPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })

    await page.goto('/dashboard/settings')
    await expect(
      page.getByRole('heading', { name: /danger zone/i }),
    ).toBeVisible()

    // Open the Delete-account modal via the trigger button.
    await page.getByRole('button', { name: /^delete account$/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/this action is irreversible/i)).toBeVisible()

    // Confirm button, scoped to the dialog (not "last match in DOM order").
    const confirm = page
      .getByRole('dialog')
      .getByRole('button', { name: /^delete account$/i })
    await expect(confirm).toBeDisabled()

    // Typed-email confirmation: wrong → disabled; correct → enabled.
    const typedField = page.getByLabel(/type.*account email/i, { exact: false }).or(
      page.locator('#typedEmail'),
    )
    await typedField.fill('wrong@example.com')
    await expect(confirm).toBeDisabled()
    await typedField.fill(accountEmail)
    await expect(confirm).toBeEnabled()

    await confirm.click()

    // Server Action redirects to /?deleted=1 and signs out — reaching this URL
    // is itself proof the delete_my_account RPC succeeded. (The ?deleted=1 toast
    // is transient; we assert deletion deterministically below instead.)
    await page.waitForURL(/\/\?deleted=1/, { timeout: 15_000 })

    // Verify deletion deterministically: the auth user is gone (admin API 404).
    const goneResp = await page.request.get(
      `${supabaseUrl}/auth/v1/admin/users/${throwawayUserId}`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    )
    expect(goneResp.status()).toBe(404)

    // And the UI login path rejects the deleted credentials.
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(accountEmail)
    await page.getByRole('button', { name: /continue/i }).click()
    // Two-step login: the deleted email is now unknown, so the 'No account
    // found' screen (not a password error) proves the credentials are gone.
    await expect(page.getByText(/no account found/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})
