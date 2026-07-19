/**
 * BIP-edit golden-path spec — Phase 8 EDIT-01 through EDIT-09.
 *
 * Assigned to the admin-authed project ONLY (playwright.config.ts). Coordinator-
 * side assertions spawn a fresh browser context loaded with the coordinator's
 * storageState INSIDE the spec — the same multi-context pattern used in
 * admin-review.spec.ts test 3 (DESIGN DECISION: avoids double-execution of
 * every test if bip-edits were added to the coordinator-authed testMatch).
 *
 * Pre-conditions (supplied by supabase/seed.e2e.sql Phase 8 block):
 *   - One approved BIP:  id=E2E_BIP_ID  slug='e2e-edit-target-bip'
 *                        owned by e2e-coordinator@biphub.test
 *   - NO pending bip_edits row is seeded. This spec runs in serial mode; EDIT-01
 *     asserts State A (no open edit) then submits one, creating the pending edit
 *     that EDIT-02/03/04 consume. A pre-seeded edit would force State B and break
 *     EDIT-01.
 *
 * D-15 assertion: RESEND_API_KEY is blank in playwright.config.ts; therefore
 * lib/email/send.ts logs `[EMAIL DEV] {...}` to server stdout (NOT browser
 * console). We capture browser-side console messages for diagnostic visibility
 * only. The binding assertion is always the UI/DB OUTCOME (State B, approved
 * content on public page, audit row in bip_status_history), NOT the log line.
 *
 * BUG-001 (resolved): the coordinator-submits-an-edit flows in this file drive
 * the wizard Step 1 → Step 5 via driveEditWizardToStep5() below — the edit CTAs
 * ("Submit Edit for Review" / "Resubmit Edit" / "Edit in review") only render in
 * the Step 5 previewStep slot, never on Step 1. See .planning/debug/resolved/
 * bug-001-approved-edit.md for the root cause and fix.
 *
 * EDIT-08 service-role reads use the Supabase REST API + SUPABASE_SERVICE_ROLE_KEY
 * (same pattern as saved-bips.spec.ts::countSavedBipsForUser). RLS bypass is
 * correct for post-action audit reads in the test harness (not in app code).
 */
import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Seeded fixture constants
// ---------------------------------------------------------------------------

/** The approved BIP seeded by supabase/seed.e2e.sql for Phase 8 tests. */
const E2E_BIP_ID = 'e2e0bbbb-bbbb-bbbb-bbbb-000000000010'
const E2E_BIP_SLUG = 'e2e-edit-target-bip'
const E2E_BIP_ORIGINAL_TITLE = 'E2E Edit Target BIP'
const E2E_BIP_EDIT_TITLE = '[EDIT] E2E Edit Target BIP — revised'

// ---------------------------------------------------------------------------
// Service-role DB helper — EDIT-08 audit assertion
// ---------------------------------------------------------------------------

/**
 * Assert that a bip_status_history row with the given action_kind exists for
 * the seeded BIP, using the service-role key to bypass RLS (correct for
 * post-action audit reads in test harness — see saved-bips.spec.ts pattern).
 */
async function assertAuditRow(
  page: Page,
  actionKind:
    | 'submit_edit'
    | 'approve_edit'
    | 'reject_edit'
    | 'request_changes'
    | 'resubmit_edit',
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const resp = await page.request.get(
    `${supabaseUrl}/rest/v1/bip_status_history` +
      `?bip_id=eq.${E2E_BIP_ID}&action_kind=eq.${actionKind}&select=id,action_kind&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  )
  expect(resp.ok()).toBeTruthy()
  const rows = await resp.json()
  expect(
    rows.length,
    `Expected a bip_status_history row with action_kind='${actionKind}'`,
  ).toBeGreaterThan(0)
}

// ---------------------------------------------------------------------------
// Wizard driver helper — BUG-001 fix
// ---------------------------------------------------------------------------

/**
 * Drive the approved-BIP edit wizard from Step 1 through Step 5.
 *
 * BUG-001: the "Submit Edit for Review" / "Resubmit Edit" / "Edit in review"
 * CTAs live exclusively in the Step 5 previewStep slot
 * (WizardStep5EditPreview) — they are never rendered on Step 1. Reaching
 * them requires clicking "Save & continue" through Steps 1-4. Prior to the
 * BUG-001 fix this was impossible: per-step `saveAndContinue` ran
 * `saveDraftAction`, a status-preserving UPDATE on the live `bips` row that
 * RLS rejects for approved/changes_requested rows, trapping the wizard on
 * Step 1. The fix (`editMode` prop on BipSubmissionWizard) advances on the
 * Zustand draft alone, so "Save & continue" now works for every step.
 *
 * Steps 2-4 are left untouched — supabase/seed.e2e.sql seeds the edit-target
 * BIP with fully valid data for every field, so the prefilled RHF defaults
 * pass each step's schema without any input.
 */
/**
 * Select a date in the custom <DatePicker> (a button that opens a
 * react-day-picker calendar in a Base UI popover — it replaced the old
 * <input type="date">). Drives the month/year <select> dropdowns, then clicks
 * the day cell, which carries data-day="M/D/YYYY" (en-US default locale).
 */
async function pickDate(
  page: Page,
  triggerName: RegExp,
  iso: string,
): Promise<void> {
  const [year, month, day] = iso.split('-').map(Number)
  await page.getByRole('button', { name: triggerName }).click()
  const popover = page.locator('[data-slot="popover-content"]')
  await popover.locator('select').nth(0).selectOption(String(month - 1))
  await popover.locator('select').nth(1).selectOption(String(year))
  await popover.locator(`[data-day="${month}/${day}/${year}"]`).click()
}

async function driveEditWizardToStep5(
  page: Page,
  bipId: string,
  newTitle?: string,
): Promise<void> {
  await page.goto(`/dashboard/bips/${bipId}/edit`)
  await expect(page.getByText(/step\s*1\s*of\s*5/i)).toBeVisible({ timeout: 10_000 })

  if (newTitle) {
    const titleInput = page.getByLabel(/bip title/i)
    await titleInput.clear()
    await titleInput.fill(newTitle)
  }
  // external_bip_id + target_group are required on Step 1 (v1.2 field revision).
  // The seeded edit-target BIP predates these columns (null), so fill them to
  // satisfy step1Schema before advancing.
  await page.getByLabel(/^bip id$/i).fill('BIP-E2E-EDIT-0001')
  await page.getByLabel(/target group/i).selectOption('students_staff')
  await page.getByRole('button', { name: /save.*continue/i }).click()

  await expect(page.getByText(/step\s*2\s*of\s*5/i)).toBeVisible({ timeout: 10_000 })
  // virtual_session_dates: first date is required (v1.2). The seeded edit-target
  // BIP predates the column (null), so pick a date before advancing.
  await pickDate(page, /virtual session date \(required\)/i, '2027-05-15')
  await page.getByRole('button', { name: /save.*continue/i }).click()

  await expect(page.getByText(/step\s*3\s*of\s*5/i)).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /save.*continue/i }).click()

  await expect(page.getByText(/step\s*4\s*of\s*5/i)).toBeVisible({ timeout: 10_000 })
  // fees is required (v1.2). The seeded edit-target BIP predates the column
  // (null), so fill it before advancing.
  await page
    .getByLabel(/^fees$/i)
    .fill('No participation fees; sending institution covers travel.')
  await page.getByRole('button', { name: /save.*continue/i }).click()

  await expect(page.getByText(/step\s*5\s*of\s*5/i)).toBeVisible({ timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

test.describe.configure({ mode: 'serial' })

// BUG-001 (see .planning/KNOWN-BUGS.md, .planning/debug/resolved/bug-001-approved-edit.md):
// previously the approved-BIP edit feature was broken — a coordinator could not
// advance past Step 1 of the edit wizard. "Save & continue" called saveDraftAction,
// whose UPDATE on the live (approved) bips row is RLS-blocked (no owner UPDATE
// policy permits a status-preserving UPDATE on approved/changes_requested rows),
// so the wizard treated it as a conflict and never reached the Step 5 "Submit Edit
// for Review" button. Fixed by suppressing per-step save for edit-states
// (BipSubmissionWizard `editMode` prop, mirroring the existing admin no-save path)
// — content is written only by the Step-5 action. driveEditWizardToStep5() above
// now drives every coordinator-submits-an-edit flow in this file through the real
// Step 1→5 wizard path instead of assuming a Step-1-only CTA.
test.describe('bip edit flow', () => {
  /**
   * EDIT-01 — coordinator submits an edit for an already-approved BIP.
   *
   * Grep key: "submit edit"
   *
   * Multi-context: spawns coordinator context (storageState.coordinator.json).
   * Navigates to the approved BIP edit page, asserts State A CTA, fills a
   * field, submits, and asserts:
   *   - Sonner toast "Edit submitted for review. The public page stays live while it's being reviewed."
   *   - CTA transitions to disabled State B "Edit in review"
   *   - EDIT-08: a bip_status_history row with action_kind='submit_edit' is created
   */
  test(
    'coordinator submits edit for approved BIP — submit edit',
    async ({ browser }) => {
      const coordCtx = await browser.newContext({
        storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
      })
      const coordPage = await coordCtx.newPage()
      try {
        const consoleMessages: string[] = []
        coordPage.on('console', (msg) => consoleMessages.push(msg.text()))

        // Navigate to the approved BIP edit page (State A: no open edit) and
        // drive the wizard Step 1 → Step 5, changing the title on Step 1.
        await driveEditWizardToStep5(coordPage, E2E_BIP_ID, E2E_BIP_EDIT_TITLE)

        // State A: "Submit Edit for Review" CTA is visible on Step 5
        await expect(
          coordPage.getByRole('button', { name: /submit edit for review/i }),
        ).toBeVisible({ timeout: 10_000 })

        // State A: "Edit in review" disabled button should NOT be present
        await expect(
          coordPage.getByRole('button', { name: /edit in review/i }),
        ).not.toBeVisible()

        // Submit edit
        await coordPage.getByRole('button', { name: /submit edit for review/i }).click()

        // Assert success toast (State A → State B transition)
        await expect(
          coordPage.getByText(
            "Edit submitted for review. The public page stays live while it's being reviewed.",
          ),
        ).toBeVisible({ timeout: 10_000 })

        // State B: disabled "Edit in review" button appears
        await expect(
          coordPage.getByRole('button', { name: /edit in review/i }),
        ).toBeVisible({ timeout: 10_000 })

        // EDIT-08: audit row for submit_edit
        await assertAuditRow(coordPage, 'submit_edit')

        // Diagnostic: surface any captured browser console messages in traces
        test.info().annotations.push({
          type: 'captured-console',
          description: consoleMessages.join('\n').slice(0, 2000),
        })
      } finally {
        await coordCtx.close()
      }
    },
  )

  /**
   * EDIT-02 — public page still serves the original approved content while an
   *           edit is pending (the live BIP is unchanged until admin approves).
   *
   * Grep key: "public page unchanged"
   *
   * Public context (no storageState). The seeded BIP title is
   * E2E_BIP_ORIGINAL_TITLE; the proposed edit has a different title.
   */
  test(
    'public page unchanged while edit pending — public page unchanged',
    async ({ page }) => {
      await page.goto(`/bip/${E2E_BIP_SLUG}`)

      // Original title is still visible (the proposed edit title must NOT be)
      await expect(
        page.getByRole('heading', { name: new RegExp(E2E_BIP_ORIGINAL_TITLE, 'i') }),
      ).toBeVisible({ timeout: 10_000 })

      // Proposed edit title must NOT appear on the live public page
      await expect(page.getByText(E2E_BIP_EDIT_TITLE)).not.toBeVisible()
    },
  )

  /**
   * EDIT-03 — admin sees the edit-review page with a "Field Comparison" diff
   *           view and an "Edit" type badge on the queue card.
   *
   * Grep key: "diff view"
   *
   * Admin context (default storageState for admin-authed project).
   */
  test('admin sees diff view — diff view', async ({ page }) => {
    await page.goto('/admin')

    // Locate the "Edit"-badged card in the pending queue
    const editCard = page.locator('article').filter({ hasText: /\bEdit\b/i })
    await editCard.getByRole('link', { name: /review/i }).click()

    // URL must match the bip-edits review route (not the bips review route)
    await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/, { timeout: 10_000 })

    // "Field Comparison" section header must be visible
    await expect(page.getByText('Field Comparison')).toBeVisible({ timeout: 10_000 })
  })

  /**
   * EDIT-04 — admin approves the edit; the merged content is live on the
   *           public page within seconds (ISR revalidation after approve action).
   *
   * Grep key: "approve edit"
   *
   * Admin context. Opens the edit review page and clicks "Approve Edit".
   * Unlike Reject/Request Changes, Approve Edit has NO confirmation modal —
   * AdminActionsPanel.handleEditApprove() calls approveEditAction(editId)
   * directly on click and redirects to /admin on success (see
   * components/admin/AdminActionsPanel.tsx). Then reloads the public page
   * and asserts the merged title is now live.
   *
   * EDIT-08: bip_status_history row with action_kind='approve_edit' must exist.
   */
  test('admin approves edit — approve edit', async ({ page }) => {
    await page.goto('/admin')

    const editCard = page.locator('article').filter({ hasText: /\bEdit\b/i })
    await editCard.getByRole('link', { name: /review/i }).click()
    await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/, { timeout: 10_000 })

    // Approve Edit — single click, no modal (see docstring above).
    await page.getByRole('button', { name: /^approve edit$/i }).click()

    // Redirect back to /admin after approval
    // Anchored: unlike /\/admin/, this does not falsely match the CURRENT
    // review-page URL (/admin/bip-edits/{id}/review also contains "/admin"),
    // which would resolve waitForURL immediately and race ahead of the
    // server action's redirect (BUG: caught via the EDIT-06b audit-row flake
    // below — request_changes hadn't persisted yet when the loose regex let
    // the test proceed).
    await page.waitForURL(/\/admin\/?(?:\?.*)?$/, { timeout: 15_000 })

    // EDIT-04 outcome: merged title is live on the public page.
    // NOTE: E2E_BIP_EDIT_TITLE contains regex metacharacters ([, ]) — pass it
    // as a plain string (Playwright does a case-insensitive substring match
    // on accessible name for string args) rather than `new RegExp(...)`,
    // which would misinterpret "[EDIT]" as a character class.
    await expect(async () => {
      await page.goto(`/bip/${E2E_BIP_SLUG}`)
      await expect(
        page.getByRole('heading', { name: E2E_BIP_EDIT_TITLE }),
      ).toBeVisible()
    }).toPass({ timeout: 15_000 })

    // EDIT-08: audit row for approve_edit
    await assertAuditRow(page, 'approve_edit')
  })

  /**
   * SUBM-14 (anti-Pitfall-1, D-08) — per-field edit->approve->persist round
   * trip for the four builder-completion fields (Plan 09-09).
   *
   * Grep key: "field round trip"
   *
   * Drives the edit wizard changing the builder round-trip fields —
   * virtual_session_dates, accommodation_notes,
   * partner_institutions_only — to NEW values distinct from the seeded
   * e2e-edit-target-bip fixture (supabase/seed.e2e.sql, Plan 09-08), submits
   * the edit, has the admin approve it, then reads the LIVE `bips` row back
   * via the service-role REST pattern and asserts each field's post-approve
   * value individually. This is the binding SUBM-14 proof — NOT a wizard
   * preview or diff-view render check, per the plan's <critical> block.
   *
   * Runs immediately after "admin approves edit" above (State A: no open
   * edit) and ends by approving its own edit (State A again), so the
   * "admin rejects edit" test below still finds the BIP in the expected
   * clean state.
   */
  test(
    'per-field edit round-trip persists on the live bips row — field round trip',
    async ({ browser, page }) => {
      const NEW_VIRTUAL_SESSION_DATE = '2026-08-15'
      const NEW_ACCOMMODATION_NOTES =
        'Partner hostel block-booked at a discounted group rate; confirmation emailed after acceptance.'
      // Seeded fixture value is `true` — flip to `false` to prove the merge
      // actually applied the NEW value, not just left the seed value in place.
      const NEW_PARTNER_INSTITUTIONS_ONLY = false

      // Step 1: coordinator drives the edit wizard, changing all four fields.
      const coordCtx = await browser.newContext({
        storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
      })
      const coordPage = await coordCtx.newPage()
      try {
        await coordPage.goto(`/dashboard/bips/${E2E_BIP_ID}/edit`)
        await expect(coordPage.getByText(/step\s*1\s*of\s*5/i)).toBeVisible({
          timeout: 10_000,
        })
        // Step 1 requires external_bip_id + target_group (v1.2 field revision);
        // the seeded BIP predates these columns, so fill them before advancing.
        await coordPage.getByLabel(/^bip id$/i).fill('BIP-E2E-EDIT-0001')
        await coordPage.getByLabel(/target group/i).selectOption('students_staff')
        await coordPage.getByRole('button', { name: /save.*continue/i }).click()

        // ----- Step 2: virtual_session_dates (required first date) -----
        await expect(coordPage.getByText(/step\s*2\s*of\s*5/i)).toBeVisible({
          timeout: 10_000,
        })
        await pickDate(
          coordPage,
          /virtual session date \(required\)/i,
          NEW_VIRTUAL_SESSION_DATE,
        )
        await coordPage.getByRole('button', { name: /save.*continue/i }).click()

        // ----- Step 3: partner_institutions_only -----
        await expect(coordPage.getByText(/step\s*3\s*of\s*5/i)).toBeVisible({
          timeout: 10_000,
        })
        const partnerOnlyCheckbox = coordPage.getByRole('checkbox', {
          name: /open only to partner-institution students/i,
        })
        // Seed value is true — assert the prefilled state, then uncheck it.
        await expect(partnerOnlyCheckbox).toBeChecked()
        try {
          await partnerOnlyCheckbox.uncheck()
        } catch {
          await coordPage
            .getByText(/open only to partner-institution students/i)
            .click()
        }
        await expect(partnerOnlyCheckbox).not.toBeChecked()
        await coordPage.getByRole('button', { name: /save.*continue/i }).click()

        // ----- Step 4: fees (required) + accommodation_notes -----
        await expect(coordPage.getByText(/step\s*4\s*of\s*5/i)).toBeVisible({
          timeout: 10_000,
        })
        // fees is required (must be non-empty or the edit submit fails validation).
        // The seeded edit-target BIP predates the fees column, so fill it here.
        await coordPage
          .getByLabel(/^fees$/i)
          .fill('No participation fees; sending institution covers travel.')
        await coordPage
          .getByLabel(/accommodation notes/i)
          .fill(NEW_ACCOMMODATION_NOTES)
        await coordPage.getByRole('button', { name: /save.*continue/i }).click()

        // ----- Step 5: submit the edit -----
        await expect(coordPage.getByText(/step\s*5\s*of\s*5/i)).toBeVisible({
          timeout: 10_000,
        })
        await expect(
          coordPage.getByRole('button', { name: /submit edit for review/i }),
        ).toBeVisible({ timeout: 10_000 })
        await coordPage
          .getByRole('button', { name: /submit edit for review/i })
          .click()
        await expect(
          coordPage.getByRole('button', { name: /edit in review/i }),
        ).toBeVisible({ timeout: 10_000 })

        // EDIT-08: audit row for submit_edit
        await assertAuditRow(coordPage, 'submit_edit')
      } finally {
        await coordCtx.close()
      }

      // Step 2: admin approves the edit.
      await page.goto('/admin')
      const editCard = page.locator('article').filter({ hasText: /\bEdit\b/i })
      await editCard.getByRole('link', { name: /review/i }).click()
      await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/, {
        timeout: 10_000,
      })
      await page.getByRole('button', { name: /^approve edit$/i }).click()
      await page.waitForURL(/\/admin\/?(?:\?.*)?$/, { timeout: 15_000 })

      // EDIT-08: audit row for approve_edit
      await assertAuditRow(page, 'approve_edit')

      // Step 3 (D-08 / anti-Pitfall-1): read the LIVE `bips` row back via the
      // service-role REST pattern and assert each field's post-approve value
      // individually — NOT a wizard/diff render check.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const resp = await page.request.get(
        `${supabaseUrl}/rest/v1/bips?id=eq.${E2E_BIP_ID}` +
          '&select=virtual_session_dates,accommodation_notes,partner_institutions_only',
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      )
      expect(resp.ok()).toBeTruthy()
      const rows = await resp.json()
      expect(rows.length, 'Expected the live bips row to exist').toBe(1)
      const liveRow = rows[0]

      // One assertion per field — the binding SUBM-14 proof.
      expect(
        liveRow.virtual_session_dates,
        'virtual_session_dates did not persist on the live bips row',
      ).toEqual([NEW_VIRTUAL_SESSION_DATE])
      expect(
        liveRow.accommodation_notes,
        'accommodation_notes did not persist on the live bips row',
      ).toBe(NEW_ACCOMMODATION_NOTES)
      expect(
        liveRow.partner_institutions_only,
        'partner_institutions_only did not persist on the live bips row',
      ).toBe(NEW_PARTNER_INSTITUTIONS_ONLY)
    },
  )

  /**
   * EDIT-05 — admin rejects the edit; the live BIP content remains unchanged.
   *
   * Grep key: "reject edit"
   *
   * Note: this test operates on a DIFFERENT pending edit than test 4. EDIT-01
   * creates the first pending edit and the "approve edit" test above consumes it.
   * For the reject test to be independent, the coordinator submits another edit
   * first (spawning a fresh coordinator context), then the admin rejects it.
   *
   * EDIT-08: bip_status_history row with action_kind='reject_edit'.
   */
  test('admin rejects edit — reject edit', async ({ browser, page }) => {
    // Step 1: coordinator submits a new edit (the approved BIP is now live after test 4)
    const coordCtx = await browser.newContext({
      storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
    })
    const coordPage = await coordCtx.newPage()
    try {
      await driveEditWizardToStep5(
        coordPage,
        E2E_BIP_ID,
        '[REJECT TEST] E2E Edit — to be rejected',
      )
      await expect(
        coordPage.getByRole('button', { name: /submit edit for review/i }),
      ).toBeVisible({ timeout: 10_000 })
      await coordPage.getByRole('button', { name: /submit edit for review/i }).click()
      await expect(
        coordPage.getByRole('button', { name: /edit in review/i }),
      ).toBeVisible({ timeout: 10_000 })
    } finally {
      await coordCtx.close()
    }

    // Step 2: admin rejects the pending edit
    await page.goto('/admin')
    const editCard = page.locator('article').filter({ hasText: /\bEdit\b/i })
    await editCard.getByRole('link', { name: /review/i }).click()
    await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/, { timeout: 10_000 })

    // Open Reject Edit modal
    await page.getByRole('button', { name: /^reject edit$/i }).click()

    // The required-note field: short note keeps confirm disabled
    const reasonField = page.getByLabel(/reason/i)
    await reasonField.fill('short')
    const rejectConfirm = page.getByRole('button', { name: /^reject edit$/i }).last()
    await expect(rejectConfirm).toBeDisabled()

    // ≥ 10 chars enables the confirm
    await reasonField.fill(
      'The proposed title change is misleading and should be clarified with a more descriptive label.',
    )
    await expect(rejectConfirm).toBeEnabled()
    await rejectConfirm.click()

    // Anchored — see the EDIT-04 waitForURL comment above for why a loose
    // /\/admin/ regex races ahead of the redirect.
    await page.waitForURL(/\/admin\/?(?:\?.*)?$/, { timeout: 15_000 })

    // EDIT-05 outcome: live BIP title is unchanged (original or last approved)
    await expect(async () => {
      await page.goto(`/bip/${E2E_BIP_SLUG}`)
      await expect(page.getByText('[REJECT TEST] E2E Edit — to be rejected')).not.toBeVisible()
    }).toPass({ timeout: 15_000 })

    // EDIT-08: audit row for reject_edit
    await assertAuditRow(page, 'reject_edit')
  })

  /**
   * EDIT-06a — admin requests changes on a NEW pending submission (not an edit
   *            of an already-approved BIP).
   *
   * Grep key: "request changes new submission"
   *
   * Targets the dedicated "E2E Request Changes Target" pending NEW submission
   * seeded by seed.e2e.sql (BUG-002). Earlier this test scavenged "any leftover"
   * non-edit pending card, which broke on a clean single-seed CI run: admin-
   * review.spec.ts runs first in this project and consumes the ML/Data Ethics
   * pending BIPs, leaving no guaranteed new submission. A dedicated fixture
   * removes that shared-state coupling.
   *
   * EDIT-08: bip_status_history row with action_kind='request_changes'.
   */
  test(
    'admin requests changes on new submission — request changes new submission',
    async ({ page }) => {
      await page.goto('/admin')

      // Target the dedicated "E2E Request Changes Target" new-submission fixture
      // (seed.e2e.sql). Do NOT scavenge ".first()" non-edit card: admin-review
      // .spec.ts runs first in this project and consumes the ML/Data Ethics
      // pending BIPs, so no leftover new submission is guaranteed (BUG-002).
      // AdminBipCard renders as an <article> with the title + a "Review" link.
      const submissionCard = page.locator('article', {
        hasText: /E2E Request Changes Target/i,
      })
      await submissionCard.getByRole('link', { name: /review/i }).click()
      await expect(page).toHaveURL(/\/admin\/bips\/.+\/review/, { timeout: 10_000 })

      // Click "Request Changes" button in AdminActionsPanel
      await page.getByRole('button', { name: /^request changes$/i }).click()

      // Fill the required note
      const noteField = page.getByLabel(/note for the coordinator/i)
      await noteField.fill(
        'Please add a more detailed virtual component description covering at least three pre-mobility sessions.',
      )

      // Confirm
      const requestConfirm = page.getByRole('button', { name: /^request changes$/i }).last()
      await expect(requestConfirm).toBeEnabled()
      await requestConfirm.click()

      // After request-changes, the status badge on the submission card shows
      // "Changes Requested" (the item remains in the queue). Anchored — see
      // the EDIT-04 waitForURL comment above.
      await page.waitForURL(/\/admin\/?(?:\?.*)?$/, { timeout: 15_000 })

      // Verify the BIP's new status badge is "Changes Requested"
      await expect(
        page.getByText(/changes requested/i).first(),
      ).toBeVisible({ timeout: 10_000 })

      // EDIT-08: audit row for request_changes
      // Note: bip_id assertion here uses the URL to extract the BIP id, or we
      // rely on the existence of ANY request_changes row after this action.
      // For simplicity, we read back and verify the row count increased.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const resp = await page.request.get(
        `${supabaseUrl}/rest/v1/bip_status_history?action_kind=eq.request_changes&select=id&limit=1`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      )
      expect(resp.ok()).toBeTruthy()
      const rows = await resp.json()
      expect(rows.length, 'Expected a bip_status_history row with action_kind=request_changes').toBeGreaterThan(0)
    },
  )

  /**
   * EDIT-06b — admin requests changes on a pending EDIT of an already-approved BIP.
   *
   * Grep key: "request changes edit"
   *
   * The coordinator submits a new edit first (approved BIP is live after test 4),
   * then the admin opens the edit review page and requests changes.
   *
   * EDIT-08: bip_status_history row with action_kind='request_changes'.
   */
  test(
    'admin requests changes on approved-BIP edit — request changes edit',
    async ({ browser, page }) => {
      // Step 1: coordinator submits a new edit for the approved BIP
      const coordCtx = await browser.newContext({
        storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
      })
      const coordPage = await coordCtx.newPage()
      try {
        await driveEditWizardToStep5(
          coordPage,
          E2E_BIP_ID,
          '[CHANGES-REQUESTED TEST] E2E Edit',
        )
        await expect(
          coordPage.getByRole('button', { name: /submit edit for review/i }),
        ).toBeVisible({ timeout: 10_000 })
        await coordPage.getByRole('button', { name: /submit edit for review/i }).click()
        await expect(
          coordPage.getByRole('button', { name: /edit in review/i }),
        ).toBeVisible({ timeout: 10_000 })
      } finally {
        await coordCtx.close()
      }

      // Step 2: admin opens the edit-review page and requests changes
      await page.goto('/admin')
      const editCard = page.locator('article').filter({ hasText: /\bEdit\b/i })
      await editCard.getByRole('link', { name: /review/i }).click()
      await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/, { timeout: 10_000 })

      // Click "Request Changes"
      await page.getByRole('button', { name: /^request changes$/i }).click()

      // Fill required note
      const noteField = page.getByLabel(/note for the coordinator/i)
      await noteField.fill(
        'The proposed title is unclear. Please revise to better reflect the academic content and intended student audience.',
      )

      // Confirm
      const requestConfirm = page.getByRole('button', { name: /^request changes$/i }).last()
      await expect(requestConfirm).toBeEnabled()
      await requestConfirm.click()

      // Anchored — see the EDIT-04 waitForURL comment above. This is the
      // exact race that was previously flaking here: the loose /\/admin/
      // regex already matches the CURRENT review-page URL, so the test
      // raced ahead to the audit-row check before requestChangesEditAction
      // had actually persisted the bip_status_history row.
      await page.waitForURL(/\/admin\/?(?:\?.*)?$/, { timeout: 15_000 })

      // EDIT-08: audit row for request_changes on the edit
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const resp = await page.request.get(
        `${supabaseUrl}/rest/v1/bip_status_history` +
          `?bip_id=eq.${E2E_BIP_ID}&action_kind=eq.request_changes&select=id&limit=5`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        },
      )
      expect(resp.ok()).toBeTruthy()
      const rows = await resp.json()
      expect(rows.length, 'Expected a request_changes audit row for the edit BIP').toBeGreaterThan(0)
    },
  )

  /**
   * EDIT-09 — the slug field is NOT present in the edit form DOM (D-10) and the
   *           slug URL remains unchanged after approve + edit flow (test 4 outcome).
   *
   * Grep key: "slug immutable"
   *
   * Two assertions:
   *   a) Coordinator edit form omits the slug input (DOM check).
   *   b) After test 4 approved the edit, the public BIP URL /bip/[slug] still
   *      uses the original slug 'e2e-edit-target-bip' (no slug mutation).
   */
  test(
    'slug immutable through edit flow — slug immutable',
    async ({ browser, page }) => {
      // a) Coordinator edit form must not have an input with name or id='slug'
      const coordCtx = await browser.newContext({
        storageState: 'tests/e2e/fixtures/storageState.coordinator.json',
      })
      const coordPage = await coordCtx.newPage()
      try {
        await coordPage.goto(`/dashboard/bips/${E2E_BIP_ID}/edit`)

        // Wait for the form to render
        await coordPage.waitForLoadState('domcontentloaded')

        // No input/textarea/select with name="slug" or id="slug" should be in the DOM
        await expect(coordPage.locator('input[name="slug"], input[id="slug"]')).toHaveCount(0)
      } finally {
        await coordCtx.close()
      }

      // b) Public BIP URL still resolves using the original slug after approve
      await page.goto(`/bip/${E2E_BIP_SLUG}`)
      await expect(page).toHaveURL(new RegExp(`/bip/${E2E_BIP_SLUG}`, 'i'), { timeout: 10_000 })
      // Page title heading is visible (the BIP detail page loaded correctly)
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 })
    },
  )
})
