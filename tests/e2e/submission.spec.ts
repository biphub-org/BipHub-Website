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

const E2E_TITLE = 'E2E Test BIP — Renewable Energy in the Alps'

/**
 * Click an element and retry until a post-condition holds (BUG-002 item C).
 *
 * A Next.js <Link> click can be swallowed during the hydration window (the
 * client router intercepts + preventDefaults the anchor before router.push is
 * wired), and a wizard "Save & continue" click can race the `motion`
 * step-transition. Both leave the app on the current view with no error — an
 * intermittent, timing-only flake (the unchanged CI re-run went green). This is
 * an in-test resilience pattern for a known client-timing race, not a global
 * `retries` bump (D-16): the app is correct for real users; only superhuman-fast
 * automation hits the window. `toPass` re-runs the whole block, so the action is
 * repeated only while the post-condition is still false.
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
 * Advance the wizard one step via the footer "Save & continue" button, retrying
 * until the step counter shows the next step (BUG-002 item C). The "Step N of 5"
 * counter lives in the wizard header, outside the animated body, and flips
 * synchronously with the step — a reliable post-condition even mid-fade.
 */
async function advance(page: Page, fromStep: number): Promise<void> {
  await clickUntil(
    () => page.getByRole('button', { name: /save.*continue/i }).click(),
    () =>
      expect(
        page.getByText(new RegExp(`step\\s*${fromStep + 1}\\s*of\\s*5`, 'i')),
      ).toBeVisible({ timeout: 6_000 }),
  )
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
      // scope to the textarea — /virtual component/i also matches the
      // "When does the virtual component happen?" <select> (virtual_timing)
      .getByRole('textbox', { name: /virtual component/i })
      .fill(
        'Four online lectures (90 min each) across the 4 weeks before physical mobility plus a group project handover.',
      )
    await page.getByLabel(/host city/i).fill('Munich')
    // Future-relative dates. application_deadline strictly before physical_start;
    // physical_end after physical_start.
    await page.getByLabel(/physical start date/i).fill(addDays(90))
    await page.getByLabel(/physical end date/i).fill(addDays(100))
    await page.getByLabel(/application deadline/i).fill(addDays(60))
    await page.getByLabel(/ects credits/i).fill('4')
    await page.getByLabel(/max participants/i).fill('20')
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
    // The "Free-text partner" card is a bare placeholder Input + native
    // <select> + an "Add as unverified" button (no FormLabels).
    await page.getByPlaceholder(/universidade do porto/i).fill('TU Wien')
    await page.locator('select').selectOption('AT')
    await page.getByRole('button', { name: /add as unverified/i }).click()
    await advance(page, 3)

    // ----- Step 4: Application info -----
    // how_to_apply_type defaults to 'url' (per WizardStep4 default). Fill the URL.
    // getByRole('textbox') — /application url/i also matches the "Application URL"
    // radio option for how_to_apply_type.
    await page
      .getByRole('textbox', { name: /application url/i })
      .fill('https://tum.example/bips/renewable-alps')
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
