/**
 * Resubmit golden-path spec — closes the v1.0 milestone-audit gap (Seam 3:
 * the rejected → revise → draft → resubmit loop).
 *
 * The coordinator-authed project loads the e2e-coordinator@biphub.test storage
 * state, so /dashboard is reachable without going through /login. The rejected
 * fixture BIP (`e2e-rejected-urban-design`) is provisioned by supabase/seed.e2e.sql.
 *
 * Covers:
 *   1. The dashboard Rejected view (the entry point the rejection email links to)
 *      shows the rejected BIP with its reason and a "Revise & resubmit" affordance.
 *   2. Clicking it transitions rejected → draft and opens the wizard hydrated
 *      from the server — the path that previously 404'd.
 *   3. The BIP has moved from the Rejected tab to Draft.
 */
import { test, expect } from '@playwright/test'

const REJECTED_TITLE = 'E2E Rejected: Urban Design Studio'

test.describe('resubmit rejected BIP', () => {
  test('coordinator reopens a rejected BIP via "Revise & resubmit"', async ({
    page,
  }) => {
    // The Rejected view is exactly where the rejection email CTA now points.
    await page.goto('/dashboard?status=rejected')

    const card = page.locator('article', { hasText: REJECTED_TITLE })
    await expect(card).toBeVisible()

    // DASH-05: the rejection reason renders in the card.
    await expect(card.getByText(/Reason:/i)).toBeVisible()

    // The previously-broken affordance is now a working button.
    await card.getByRole('button', { name: /revise & resubmit/i }).click()

    // rejected → draft succeeded and routed into the wizard (was a 404 before).
    await expect(page).toHaveURL(/\/dashboard\/bips\/[^/]+\/edit$/)

    // Wizard hydrated from the DB with the existing BIP content.
    await expect(page.getByLabel(/bip title/i)).toHaveValue(REJECTED_TITLE)

    // Back on the dashboard, the BIP has left Rejected and is now a Draft.
    await page.goto('/dashboard?status=draft')
    await expect(
      page.locator('article', { hasText: REJECTED_TITLE }),
    ).toBeVisible()
  })
})
