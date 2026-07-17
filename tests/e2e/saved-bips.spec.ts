/**
 * Saved BIPs E2E spec — Phase 6 / Plan 06-04.
 *
 * Coverage:
 *   STUD-04  — save persists across a full page reload (server-side, not localStorage)
 *   STUD-04  — unsave removes BIP from the saved list
 *   STUD-05  — saved BIP appears after fresh session (cross-device parity)
 *   STUD-07  — /student-dashboard/saved shows saved BIPs with current metadata (one list)
 *   STUD-08  — after account deletion, zero saved_bips rows remain for that user (cascade)
 *   FOUN-09  — cascade deletion verified via service-role direct read (zero orphan rows)
 *   FOUN-10  — /privacy contains "Saved BIPs" enumeration and saved_bips text
 *
 * NOT covered here (D-02a):
 *   Legacy sweep (localStorage migration) — pure core is unit-tested in
 *   tests/schemas/saved-bips.test.ts; no v1.0 bookmark UI exists to drive at E2E level.
 *
 * Session setup: @supabase/ssr cookie injection (base64url-encoded password-auth session),
 * matching the pattern established in Plan 05-04 / student-auth.spec.ts. This approach is
 * used because the cloud Supabase redirect allowlist is restricted to the production Vercel
 * URL, making browser magic-link navigation impractical in this test context.
 *
 * Safety: the spec never runs against the production cloud ref unless E2E_ALLOW_CLOUD=1
 * is explicitly set (playwright.config.ts safety guard). All throwaway test data created
 * by the deletion test is cleaned up after the test (the admin user deletion itself is the
 * cleanup — FK cascade removes saved_bips rows automatically; we verify this as the test
 * assertion rather than a separate cleanup step).
 */
import { test, expect, type Page } from '@playwright/test'

const STUDENT_EMAIL = 'e2e-student@biphub.test'

// ---------------------------------------------------------------------------
// Helpers — verbatim from student-auth.spec.ts (not exported, so duplicated
// following the established pattern in this codebase)
// ---------------------------------------------------------------------------

/**
 * Sign in the student fixture by injecting a session cookie directly.
 * Equivalent to student-auth.spec.ts signInStudent — reused verbatim.
 *
 * The cloud e2e-student fixture must have password='Student!Test1' and
 * profiles.role='student'. If either diverges, update via the Supabase admin API.
 */
async function signInStudent(page: Page): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

  // Step 1: obtain a session via password auth (anon key, not service-role)
  const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email: STUDENT_EMAIL, password: 'Student!Test1' },
  })
  expect(tokenResp.ok()).toBeTruthy()
  const session = await tokenResp.json()
  expect(session.access_token).toBeTruthy()

  // Step 2: encode the session in @supabase/ssr cookie format: `base64-{base64url(JSON)}`
  const sessionJson = JSON.stringify(session)
  const encoded = 'base64-' + Buffer.from(sessionJson).toString('base64url')

  // Step 3: inject the cookie before navigating
  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: encoded,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
      httpOnly: true,
      secure: false,
    },
  ])

  // Step 4: navigate to /student-dashboard — middleware (3d) allows role=student through
  await page.goto('/student-dashboard')
  await page.waitForURL(/\/student-dashboard/, { timeout: 15_000 })
}

/**
 * Sign in a throwaway user by injecting a session cookie directly.
 * Same pattern as signInStudent but accepts arbitrary credentials.
 */
async function signInUser(page: Page, email: string, password: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

  const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  expect(tokenResp.ok()).toBeTruthy()
  const session = await tokenResp.json()
  expect(session.access_token).toBeTruthy()

  const sessionJson = JSON.stringify(session)
  const encoded = 'base64-' + Buffer.from(sessionJson).toString('base64url')

  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: encoded,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
      httpOnly: true,
      secure: false,
    },
  ])

  await page.goto('/student-dashboard')
  await page.waitForURL(/\/student-dashboard/, { timeout: 15_000 })
}

/**
 * Resolve the first approved BIP ID and title available via the Supabase REST API
 * using the service-role key (RLS bypass for test setup reads only).
 *
 * Returns { bipId, bipTitle, bipSlug } for use in save/unsave assertions.
 * Throws if no approved BIP is available (seed.sql must contain at least one).
 */
async function getFirstApprovedBip(page: Page): Promise<{ bipId: string; bipTitle: string; bipSlug: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const resp = await page.request.get(
    `${supabaseUrl}/rest/v1/bips?status=eq.approved&select=id,title,slug&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  )
  expect(resp.ok()).toBeTruthy()
  const rows = await resp.json()
  expect(rows.length).toBeGreaterThan(0)
  return { bipId: rows[0].id, bipTitle: rows[0].title, bipSlug: rows[0].slug }
}

/**
 * Save the first approved BIP by driving the detail-page BipSaveButton, returning
 * its title for later assertions.
 *
 * The listing-card save button was removed in 5d393f6 (UX cleanup — the save
 * control now lives only on the /bip/[slug] detail page). These specs therefore
 * drive that control instead of a card heart.
 *
 * /bip/[slug] is ISR/cookie-free, so the button's isStudent + saved state hydrate
 * client-side via <SavedBipsHydrator> (getSavedStateAction reads the session).
 * It starts as "Sign in to save" and flips to "Save {title}" once the store
 * adopts the authed session — toBeVisible auto-waits for that. On the Desktop
 * Chrome viewport the mobile apply bar (lg:hidden) is display:none, so only the
 * sidebar's button is in the a11y tree (no strict-mode collision).
 */
/**
 * Resolve the e2e-student fixture's real auth user id via a password grant.
 *
 * Deliberately NOT hardcoded: on the cloud test project the fixture users were
 * provisioned outside seed.e2e.sql, so their ids drift from the seed's fixed
 * UUIDs. Deriving the id from the live session keeps the cleanup correct
 * regardless of how the fixture was created.
 */
async function getStudentUserId(page: Page): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const resp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email: STUDENT_EMAIL, password: 'Student!Test1' },
  })
  expect(resp.ok()).toBeTruthy()
  const session = await resp.json()
  const payload = JSON.parse(
    Buffer.from(session.access_token.split('.')[1], 'base64').toString(),
  )
  expect(payload.sub).toBeTruthy()
  return payload.sub
}

async function saveFirstApprovedBipFromDetail(
  page: Page,
): Promise<{ title: string; slug: string }> {
  const { bipId, bipTitle, bipSlug } = await getFirstApprovedBip(page)

  // Start from a known-clean slate: delete any pre-existing saved_bips row for
  // this (student, bip) via service-role (RLS bypass — test setup only). These
  // specs run serially and all resolve to the same first approved BIP, and the
  // in-test unsave cleanups are optimistic (the UI flips before the cloud DELETE
  // commits). Without this, a leftover row makes the save below hit a unique
  // violation, revert, and never flip to "Unsave". Awaiting the DELETE makes each
  // save independent of prior-test/prior-run timing.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const studentUserId = await getStudentUserId(page)
  const cleanupResp = await page.request.delete(
    `${supabaseUrl}/rest/v1/saved_bips?user_id=eq.${studentUserId}&bip_id=eq.${bipId}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  )
  expect(cleanupResp.ok()).toBeTruthy()

  await page.goto(`/bip/${bipSlug}`)
  await page.waitForURL(/\/bip\//, { timeout: 10_000 })

  const saveButton = page.getByRole('button', { name: `Save ${bipTitle}` })
  await expect(saveButton).toBeVisible({ timeout: 10_000 })
  await saveButton.click()

  // Optimistic flip: the button becomes "Unsave {title}" immediately.
  await expect(
    page.getByRole('button', { name: `Unsave ${bipTitle}` }),
  ).toBeVisible({ timeout: 10_000 })

  // Confirm SERVER-side persistence before returning. The flip above is optimistic
  // (the saveAction INSERT is still in flight), so poll saved_bips via service-role
  // until the row lands — otherwise a saved-list navigation can race ahead of the
  // commit and render the empty state.
  await expect(async () => {
    const check = await page.request.get(
      `${supabaseUrl}/rest/v1/saved_bips?user_id=eq.${studentUserId}&bip_id=eq.${bipId}&select=id`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    )
    expect(check.ok()).toBeTruthy()
    expect(await check.json()).toHaveLength(1)
  }).toPass({ timeout: 10_000 })

  return { title: bipTitle, slug: bipSlug }
}

/**
 * Unsave a BIP by driving the detail-page toggle. Like save, the unsave control
 * was removed from the listing/saved-list cards in 5d393f6 and now lives only on
 * /bip/[slug]. Leaves the button in the optimistic "Save {title}" state; callers
 * that need to assert server-side removal should poll the saved list (the unsave
 * server round-trip lags the optimistic UI flip).
 */
async function unsaveBipFromDetail(
  page: Page,
  bipSlug: string,
  bipTitle: string,
): Promise<void> {
  await page.goto(`/bip/${bipSlug}`)
  await page.waitForURL(/\/bip\//, { timeout: 10_000 })
  const unsaveButton = page.getByRole('button', { name: `Unsave ${bipTitle}` })
  await expect(unsaveButton).toBeVisible({ timeout: 10_000 })
  await unsaveButton.click()
  await expect(
    page.getByRole('button', { name: `Save ${bipTitle}` }),
  ).toBeVisible({ timeout: 10_000 })
}

/**
 * Count saved_bips rows for a given userId using the service-role key (RLS bypass).
 *
 * The service-role key is the correct tool for post-deletion audit reads (T-06-19
 * mitigation) — see threat model in 06-04-PLAN.md.
 */
async function countSavedBipsForUser(page: Page, userId: string): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const resp = await page.request.get(
    `${supabaseUrl}/rest/v1/saved_bips?user_id=eq.${userId}&select=id`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'count=exact',
      },
    },
  )
  expect(resp.ok()).toBeTruthy()
  // PostgREST returns count in Content-Range header: "0-N/total" or "*/total"
  const contentRange = resp.headers()['content-range']
  if (contentRange) {
    const total = contentRange.split('/')[1]
    if (total !== undefined && total !== '*') {
      return parseInt(total, 10)
    }
  }
  // Fallback: count rows in body
  const rows = await resp.json()
  return Array.isArray(rows) ? rows.length : 0
}

/**
 * Save a BIP directly via service-role REST (RLS bypass) — used in test setup to
 * plant a saved_bips row for the throwaway user before driving the UI deletion flow.
 *
 * Service-role is correct here: this is a test setup action, not app code. The actual
 * save pathway (RLS-scoped) is exercised by the STUD-04 browser tests.
 */
async function saveBipViaServiceRole(
  page: Page,
  userId: string,
  bipId: string,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const resp = await page.request.post(`${supabaseUrl}/rest/v1/saved_bips`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates',
    },
    data: { user_id: userId, bip_id: bipId },
  })
  // 201 Created or 204 No Content (ignore-duplicates) — both are success
  expect([201, 204]).toContain(resp.status())
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('saved bips', () => {

  // -------------------------------------------------------------------------
  // STUD-04 / STUD-05 — save persists across reload and fresh session
  // -------------------------------------------------------------------------
  test('STUD-04/STUD-05: save persists after page reload and fresh session', async ({ page, browser }) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }

    // Establish student session
    await signInStudent(page)

    // Save the first approved BIP from its detail page (listing-card save was
    // removed in 5d393f6 — save now lives only on /bip/[slug]).
    const { title: savedBipTitle, slug: savedBipSlug } =
      await saveFirstApprovedBipFromDetail(page)

    // The saved-state button carries aria-pressed=true.
    await expect(
      page.getByRole('button', { name: `Unsave ${savedBipTitle}` }),
    ).toHaveAttribute('aria-pressed', 'true')

    // Full page reload — tests server-side persistence (STUD-04 SC1). The detail
    // page is ISR/cookie-free, so saved state re-hydrates from the DB via
    // getSavedStateAction (not localStorage); the button returns to "Unsave".
    await page.reload()
    await expect(
      page.getByRole('button', { name: `Unsave ${savedBipTitle}` }),
    ).toBeVisible({ timeout: 10_000 })

    // Cross-device parity (STUD-05): clear cookies + re-establish session
    // (simulates signing in from device B)
    await page.context().clearCookies()
    await signInStudent(page)

    // Navigate to saved list — the BIP must appear there (server-side state survives)
    await page.goto('/student-dashboard/saved')
    await page.waitForURL(/\/student-dashboard\/saved/, { timeout: 10_000 })

    // The saved BIP title is visible in the list (live metadata from bips table — STUD-07)
    await expect(page.getByText(savedBipTitle, { exact: false })).toBeVisible({ timeout: 10_000 })

    // Clean up: unsave from the detail page so the fixture is left tidy.
    await unsaveBipFromDetail(page, savedBipSlug, savedBipTitle)
  })

  // -------------------------------------------------------------------------
  // STUD-04 — unsave removes BIP from the saved list
  // -------------------------------------------------------------------------
  test('STUD-04: unsave removes BIP from the saved list on /student-dashboard/saved', async ({ page }) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }

    await signInStudent(page)

    // Save a BIP from its detail page (listing-card save removed in 5d393f6 —
    // save now lives only on /bip/[slug]) so we have something to unsave.
    const { title: bipTitle, slug: bipSlug } = await saveFirstApprovedBipFromDetail(page)

    // Confirm the card is in the saved list
    await page.goto('/student-dashboard/saved')
    await page.waitForURL(/\/student-dashboard\/saved/, { timeout: 10_000 })
    await expect(page.getByText(bipTitle, { exact: false })).toBeVisible({ timeout: 10_000 })

    // Unsave from the detail page (the saved-list card toggle was removed in 5d393f6).
    await unsaveBipFromDetail(page, bipSlug, bipTitle)

    // STUD-04 outcome: the BIP is removed from the saved list. Poll the list
    // (re-navigating) so the assertion absorbs the unsave server round-trip that
    // lags the optimistic UI flip.
    await expect(async () => {
      await page.goto('/student-dashboard/saved')
      await expect(page.getByText(bipTitle, { exact: false })).toHaveCount(0)
    }).toPass({ timeout: 15_000 })
  })

  // -------------------------------------------------------------------------
  // STUD-07 — /student-dashboard/saved shows one list with current metadata
  // -------------------------------------------------------------------------
  test('STUD-07: /student-dashboard/saved shows saved BIP with live metadata', async ({ page }) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }

    await signInStudent(page)

    // Save a BIP from its detail page (listing-card save removed in 5d393f6 —
    // save now lives only on /bip/[slug]).
    const { title: bipTitle, slug: bipSlug } = await saveFirstApprovedBipFromDetail(page)

    // Navigate to the saved list page
    await page.goto('/student-dashboard/saved')
    await page.waitForURL(/\/student-dashboard\/saved/, { timeout: 10_000 })

    // The page heading must be "Saved BIPs" (one list — STUD-07)
    await expect(page.getByRole('heading', { name: 'Saved BIPs' })).toBeVisible({ timeout: 5_000 })

    // The saved BIP title must be visible (live metadata from the bips table)
    await expect(page.getByText(bipTitle, { exact: false })).toBeVisible({ timeout: 10_000 })

    // Clean up: unsave from the detail page so the fixture is clean for re-runs.
    await unsaveBipFromDetail(page, bipSlug, bipTitle)
  })

  // -------------------------------------------------------------------------
  // STUD-08 / FOUN-09 — account deletion cascades to zero saved_bips rows
  // -------------------------------------------------------------------------
  test('STUD-08/FOUN-09: account deletion cascades — zero orphan saved_bips rows', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
    }

    // ------------------------------------------------------------------
    // Step 1: Create a throwaway student account via admin API.
    //
    // We do NOT use e2e-student@biphub.test — that fixture is non-destructive
    // and other specs depend on it (EDGE-CASES-DEFERRED destructive-fixture
    // contract). We also do NOT use e2e-coordinator-fresh@biphub.test —
    // that is destructively consumed by auth.spec.ts.
    // ------------------------------------------------------------------
    const throwawayEmail = `e2e-saved-bips-throwaway-${Date.now()}@biphub.test`
    const throwawayPassword = 'Throwaway!Test1'

    const createResp = await page.request.post(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: throwawayEmail,
        password: throwawayPassword,
        email_confirm: true,
        user_metadata: { role: 'student' },
        app_metadata: { role: 'student' },
      },
    })
    expect(createResp.ok()).toBeTruthy()
    const throwawayUser = await createResp.json()
    const throwawayUserId: string = throwawayUser.id
    expect(throwawayUserId).toBeTruthy()

    // Upsert a profile row so the student role flows correctly
    // (handle_new_user trigger may not fire for admin-API-created users in all versions)
    await page.request.post(`${supabaseUrl}/rest/v1/profiles`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      data: { id: throwawayUserId, role: 'student' },
    })

    // ------------------------------------------------------------------
    // Step 2: Save a BIP via service-role REST (RLS bypass for test setup).
    //
    // Using service-role here rather than the user's JWT because:
    //   a) The throwaway user's JWT was obtained immediately after account creation —
    //      the Custom Access Token Hook may not yet reflect profiles.role='student'.
    //   b) This is a test setup action; the actual RLS-scoped save is exercised
    //      in the STUD-04 browser tests.
    // ------------------------------------------------------------------
    const { bipId: testBipId } = await getFirstApprovedBip(page)
    await saveBipViaServiceRole(page, throwawayUserId, testBipId)

    // ------------------------------------------------------------------
    // Step 3: Assert exactly one saved_bips row exists for the throwaway user.
    // ------------------------------------------------------------------
    const countBefore = await countSavedBipsForUser(page, throwawayUserId)
    expect(countBefore).toBe(1)

    // ------------------------------------------------------------------
    // Step 4: Sign in as the throwaway student and drive the DeleteAccountDialog UI.
    // ------------------------------------------------------------------
    await signInUser(page, throwawayEmail, throwawayPassword)
    await page.waitForURL(/\/student-dashboard/, { timeout: 15_000 })

    // Open the Delete Account dialog — the trigger button is "Delete account"
    // Use first() since the dialog trigger and confirm button share the same label
    const deleteBtn = page.getByRole('button', { name: /^delete account$/i }).first()
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    // The dialog should now be open — look for the confirmation input (email textbox)
    const emailInput = page.getByRole('textbox')
    await expect(emailInput).toBeVisible({ timeout: 5_000 })

    // Type the throwaway email to confirm deletion
    await emailInput.fill(throwawayEmail)

    // Click the destructive confirm button — the submit button inside the dialog form.
    // There are now 3 buttons visible (trigger still in DOM, Cancel, Delete account submit).
    // The submit is the LAST "Delete account" button (inside the form, not the trigger).
    const confirmBtn = page.getByRole('button', { name: /^delete account$/i }).last()
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 })
    await confirmBtn.click()

    // ------------------------------------------------------------------
    // Step 5: Assert redirect to /?deleted=1 (the RPC + cascade happened).
    // ------------------------------------------------------------------
    await page.waitForURL(/\?deleted=1/, { timeout: 20_000 })
    expect(page.url()).toContain('deleted=1')

    // ------------------------------------------------------------------
    // Step 6: Assert ZERO saved_bips rows for the deleted user (FOUN-09).
    //
    // The FK cascade (ON DELETE CASCADE on saved_bips.user_id → auth.users)
    // removes all saved_bips rows when the auth.users row is deleted by the RPC.
    // We read via service-role key (RLS bypass correct for post-deletion audit).
    // ------------------------------------------------------------------
    const countAfter = await countSavedBipsForUser(page, throwawayUserId)
    expect(countAfter).toBe(0)
  })

  // -------------------------------------------------------------------------
  // FOUN-10 — /privacy contains saved_bips enumeration text
  // -------------------------------------------------------------------------
  test('FOUN-10: /privacy contains saved_bips enumeration and cascading-deletion copy', async ({ page }) => {
    await page.goto('/privacy')
    await page.waitForURL(/\/privacy/, { timeout: 10_000 })

    // "Saved BIPs" heading/label must be visible (FOUN-10 primary criterion)
    await expect(page.getByText('Saved BIPs', { exact: false })).toBeVisible({ timeout: 5_000 })

    // saved_bips table name must appear in the page content (multiple occurrences are expected)
    await expect(page.getByText('saved_bips', { exact: false }).first()).toBeVisible({ timeout: 5_000 })

    // cascading deletion language must be present
    await expect(page.getByText('cascading deletion', { exact: false })).toBeVisible({ timeout: 5_000 })
  })

})
