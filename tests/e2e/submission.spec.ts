/**
 * Submission wizard golden-path spec — Plan 04-07 Task 5 (D-14 submission scope).
 *
 * The coordinator-authed project loads the e2e-coordinator@biphub.test
 * storage state, so /dashboard is reachable without going through /login.
 *
 * Covers:
 *   1. Walk the 5-step wizard from /dashboard/bips/new and submit the BIP
 *      — verify it shows up in the Pending tab on /dashboard
 *   2. Reopen an in-progress / pending BIP from the dashboard list for editing
 *   3. Withdraw a pending BIP back to draft
 *
 * Dates are computed relative to Date.now() so the spec does not drift past
 * application_deadline / physical_start validation thresholds as time passes.
 * Step 2 uses <Input type="date"> — Pattern B from the plan; we `.fill('YYYY-MM-DD')`
 * directly rather than driving a calendar popover.
 */
import { test, expect, type Page } from '@playwright/test'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10)
}

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

const E2E_TITLE = 'E2E Test BIP — Renewable Energy in the Alps'

/**
 * Retry an IDEMPOTENT click until a post-condition holds (BUG-002 item C).
 *
 * Use only for side-effect-free navigation: a Next.js <Link> click can be
 * swallowed during the hydration window (the client router intercepts +
 * preventDefaults the anchor before router.push is wired), leaving the app on
 * the current URL with no error — an intermittent, timing-only flake. `toPass`
 * re-runs the block, so the click repeats only while the post-condition is
 * false. This is an in-test resilience pattern for a known client-timing race,
 * not a global `retries` bump (D-16). Do NOT use this for the wizard's
 * "Save & continue" — that click writes a draft (optimistic-concurrency save),
 * so repeating it self-conflicts; use `advance()` instead.
 */
async function clickUntil(
  click: () => Promise<void>,
  assertDone: () => Promise<void>,
  timeout = 20_000,
): Promise<void> {
  await expect(async () => {
    await click()
    await assertDone()
  }).toPass({ timeout })
}

/**
 * Advance the wizard one step via the footer "Save & continue" button.
 *
 * Clicked exactly ONCE — the button triggers a `saveDraftAction` UPDATE guarded
 * by optimistic concurrency (`lastKnownUpdatedAt`), and a 1.5s debounced
 * auto-save (BipSubmissionWizard) fires on the same draft. If the two saves
 * overlap, the second sends a stale `updated_at` and the wizard raises its
 * "Draft updated in another tab" conflict dialog, which overlays the step and
 * blocks the next field (BUG-002 item C — this is what made Step 4 flake). In a
 * single-user test our in-memory draft is authoritative, so on conflict we
 * "Overwrite with this version" and re-submit to advance. Re-clicking the save
 * button on a retry would itself trip this guard, so we never blind-retry it.
 */
async function advance(page: Page, fromStep: number): Promise<void> {
  const saveBtn = page.getByRole('button', { name: /save.*continue/i })
  const nextStep = page.getByText(
    new RegExp(`step\\s*${fromStep + 1}\\s*of\\s*5`, 'i'),
  )
  const overwriteBtn = page.getByRole('button', {
    name: /overwrite with this version/i,
  })

  await saveBtn.click()
  // Either the step advances, or the concurrency guard pops the conflict dialog.
  await expect(nextStep.or(overwriteBtn).first()).toBeVisible({ timeout: 15_000 })
  if (await overwriteBtn.isVisible().catch(() => false)) {
    // handleOverwrite re-reads updated_at and re-saves but does NOT advance the
    // step, so click "Save & continue" once more to move forward.
    await overwriteBtn.click()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
    await saveBtn.click()
    await expect(nextStep).toBeVisible({ timeout: 15_000 })
  }
}

test.describe('submission wizard', () => {
  test('coordinator submits a BIP through the 5-step wizard', async ({ page }) => {
    await page.goto('/dashboard')

    // "+ Submit a BIP" CTA in dashboard header (Plan 02-05 D-11).
    const submitCta = page.getByRole('link', { name: /submit a bip/i })
    await expect(submitCta).toBeVisible()
    await clickUntil(
      () => submitCta.click(),
      () => expect(page).toHaveURL(/\/dashboard\/bips\/new/, { timeout: 4_000 }),
    )

    // ----- Step 1: Basic info -----
    await page.getByLabel(/bip title/i).fill(E2E_TITLE)
    // external_bip_id — required Official Erasmus+ BIP code.
    await page.getByLabel(/^bip id$/i).fill('BIP-E2E-0001')
    // target_group — required single choice.
    await page.getByLabel(/target group/i).selectOption('students_staff')
    // Fields of study — a multi-select checkbox group (min 1). Each field label
    // from lib/isced.ts wraps a Checkbox, so the checkbox's accessible name is
    // the field label. Check two to exercise the multi-field capability.
    for (const field of ['Medicine', 'Law']) {
      const box = page.getByRole('checkbox', { name: field })
      try {
        await box.check()
      } catch {
        await page.getByText(field, { exact: true }).click()
      }
    }
    await page
      .getByLabel(/description/i)
      .fill(
        'A 10-day blended intensive on small-scale renewable systems with TU Munich, KU Leuven, and Politecnico di Milano. Mixed undergrad and master cohort.',
      )
    await page
      .getByLabel(/learning outcomes/i)
      .fill(
        'Identify, design, and assess micro-hydro and solar installations in alpine environments.',
      )
    await advance(page, 1)

    // ----- Step 2: Programme details -----
    await page
      .getByRole('textbox', { name: /virtual component/i })
      .fill(
        'Four online lectures (90 min each) across the 4 weeks before physical mobility plus a group project handover.',
      )
    // virtual_session_dates — first date required, plus an optional extra date
    // added via the "Add another date" button. Dates are entered through the
    // custom <DatePicker> calendar popover (pickDate), not a native input.
    await pickDate(page, /virtual session date \(required\)/i, addDays(80))
    await page.getByRole('button', { name: /add another date/i }).click()
    await pickDate(page, /additional virtual session date 2/i, addDays(87))
    await page.getByLabel(/host city/i).fill('Munich')
    // Future-relative dates. physical_end after physical_start.
    await pickDate(page, /physical mobility start date/i, addDays(90))
    await pickDate(page, /physical mobility end date/i, addDays(100))
    await pickDate(page, /application deadline/i, addDays(60))
    await page.getByLabel(/ects credits/i).fill('4')
    // max_participants — ceiling is now 100 (item 9).
    await page.getByLabel(/maximum number of participants/i).fill('20')
    // study_levels: at least one checkbox. getByRole('checkbox') — getByLabel
    // also matches the hidden native <input> Base UI renders alongside.
    await page.getByRole('checkbox', { name: /bachelor/i }).check()
    await page.getByLabel(/language of instruction/i).fill('en')
    // Minimum CEFR level (select).
    const cefr = page.getByLabel(/minimum cefr/i)
    try {
      await cefr.selectOption('B2')
    } catch {
      await cefr.click()
      await page.getByRole('option', { name: /B2/i }).click()
    }
    await advance(page, 2)

    // ----- Step 3: Partners -----
    // Free-text partners were removed — partners are added from the registry via
    // the UniversityCombobox. Search then pick the first result (seed data has
    // registered universities). Partners are optional, so a miss is non-fatal.
    await page.getByRole('combobox').click()
    await page
      .getByPlaceholder(/search by name or erasmus code/i)
      .fill('Uni')
    const firstResult = page.getByRole('option').first()
    try {
      await firstResult.click({ timeout: 3_000 })
    } catch {
      // No registry match in this environment — partners are optional; continue.
      await page.keyboard.press('Escape')
    }
    // partner_institutions_only: tick the create-path checkbox (SUBM-11).
    // Targeted by data-testid (not visible copy) — its accessible name is a
    // full sentence that copy edits keep breaking.
    const partnerOnlyCheckbox = page.getByTestId('partner-institutions-only')
    try {
      await partnerOnlyCheckbox.check()
    } catch {
      await partnerOnlyCheckbox.click()
    }
    await advance(page, 3)

    // ----- Step 4: Application info -----
    // how_to_apply_type defaults to 'url' (per WizardStep4 default). Fill the URL.
    // getByRole('textbox') — /application url/i also matches the "Application URL"
    // radio option for how_to_apply_type.
    await page
      .getByRole('textbox', { name: /application url/i })
      .fill('https://tum.example/bips/renewable-alps')
    // fees: required Step 4 field (must be filled or submit fails validation).
    await page
      .getByLabel(/^fees$/i)
      .fill('No participation fees; students cover their own travel and accommodation.')
    // accommodation_notes: optional Step 4 field exercised for create-path coverage (SUBM-10).
    await page
      .getByLabel(/accommodation notes/i)
      .fill(
        'Shared university dormitory rooms available at approx. 25 EUR/night; booking link sent after acceptance.',
      )
    await advance(page, 4)

    // ----- Step 5: Preview + Submit -----
    // The preview reuses <BipBody>/<BipSidebar>, which don't render the title
    // (that's page chrome on the public route). Assert on the preview banner to
    // confirm Step 5 rendered, then submit.
    await expect(
      page.getByText(/this is a preview of your bip/i),
    ).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /submit for review/i }).click()

    // After submit, dashboard re-renders with the new BIP in Pending.
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    // The pending tab may be linked or rendered as a tab role; either works.
    const pendingTab = page
      .getByRole('tab', { name: /pending/i })
      .or(page.getByRole('link', { name: /pending/i }))
    await pendingTab.first().click()
    // .first(): a re-run (or repeat-each stress run) can leave more than one
    // pending BIP with this title; we only need to confirm at least one landed.
    await expect(page.getByText(E2E_TITLE).first()).toBeVisible({ timeout: 10_000 })
  })

  test('coordinator edits pending BIP', async ({ page }) => {
    await page.goto('/dashboard?status=pending')
    // The first pending BIP card / row has an Edit affordance.
    await page.getByRole('link', { name: /edit/i }).first().click()
    // Wizard shell shows "Step N of 5".
    await expect(page.getByText(/step\s*\d\s*of\s*5/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('coordinator withdraws pending BIP', async ({ page }) => {
    await page.goto('/dashboard?status=pending')
    // Scope to the dedicated disposable "E2E Withdraw Target" fixture
    // (seed.e2e.sql). Do NOT use .first(): the seeded admin-review BIPs
    // ("Machine Learning…", "Data Ethics…") are coordinator-owned and also
    // appear in this pending list, so withdrawing .first() could remove a BIP
    // admin-review.spec.ts depends on (BUG-002). The coordinator card is an
    // <article> with an <h3> title + a "Withdraw" button (DashboardBipCard).
    const withdrawCard = page.locator('article', {
      hasText: /E2E Withdraw Target/i,
    })
    await withdrawCard.getByRole('button', { name: /withdraw/i }).click()
    // Dialog opens with a confirm button.
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    await page
      .getByRole('button', { name: /withdraw|confirm|yes/i })
      .last()
      .click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
  })
})
