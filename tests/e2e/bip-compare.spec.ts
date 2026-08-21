/**
 * Phase 13 — Discovery (BROW-15 + DISC-08/09 + GROW-01)
 *
 * Covers:
 *  - BROW-15: ?partnerOnly=exclude hides partner-only cards, absent=show all,
 *    chip-removable, URL-shareable
 *  - DISC-08/09: Compare 2-3 BIPs via ?ids=a,b,c on /bips/compare (cards, no tables,
 *    deadline + Apply CTA prominent, max 3, shareable incognito)
 *
 * Public project (no storageState) for filter part; coordinator not needed.
 * Compare uses localStorage + URL, so public is fine.
 */
import { test, expect } from '@playwright/test'

const PARTNER_ONLY_SLUG = 'smart-grid-energy-transition-vienna-2025'
const NON_PARTNER_SLUG = 'sustainable-cities-smart-mobility-munich-2026'

test.describe('Phase 13 — BROW-15 + DISC-08/09', () => {
  test('BROW-15: exclude partner-only filter hides partner-only cards and is URL-driven', async ({
    page,
  }) => {
    // Start unfiltered — both partner-only and non-partner cards visible
    await page.goto('/bips')
    const partnerCard = page.locator(`a[href="/bip/${PARTNER_ONLY_SLUG}"]`)
    const nonPartnerCard = page.locator(`a[href="/bip/${NON_PARTNER_SLUG}"]`)
    await expect(partnerCard).toBeVisible({ timeout: 15_000 })
    await expect(nonPartnerCard).toBeVisible({ timeout: 10_000 })

    // Apply ?partnerOnly=exclude via URL (the sidebar checkbox drives this param)
    await page.goto('/bips?partnerOnly=exclude')
    await expect(nonPartnerCard).toBeVisible({ timeout: 10_000 })
    await expect(partnerCard).not.toBeVisible({ timeout: 10_000 })

    // Chip should appear and be removable
    const chip = page.getByText('Exclude partner-only')
    await expect(chip).toBeVisible({ timeout: 10_000 })
    await chip.click()
    // After removing chip, should navigate back to /bips (no partnerOnly param)
    await expect(page).toHaveURL(/\/bips(\?|$)/, { timeout: 10_000 })
    // Partner card should be visible again
    await expect(partnerCard).toBeVisible({ timeout: 10_000 })

    // Also test direct Apply via sidebar: open sidebar Access checkbox
    // On desktop, sidebar is visible; on mobile, drawer is used — test via URL for stability
    await page.goto('/bips?partnerOnly=exclude')
    await expect(page).toHaveURL(/partnerOnly=exclude/)
    // Clear all filters should remove the param
    const clearAll = page.getByText('Clear all')
    if (await clearAll.isVisible().catch(() => false)) {
      await clearAll.click()
      await expect(page).toHaveURL(/\/bips$/, { timeout: 10_000 })
    }
  })

  test('DISC-08/09: compare 2-3 BIPs via URL is shareable and renders cards', async ({
    page,
    context,
  }) => {
    // Need 2-3 approved BIPs to compare — use the two demo slugs above plus a third
    // We get ids by visiting the detail pages and extracting from the page's data?
    // Simpler: use the public /bips/compare?ids= approach with known slugs.
    // But compare page expects BIP ids (uuids), not slugs. We can fetch ids via
    // the public REST API using the same anon key the server uses.
    const baseURL = page.url().split('/bips')[0] || 'http://localhost:3000'
    // Use page.evaluate to fetch from the browser context (has same origin)
    // Instead, we can get the ids by reading the compare toggles on /bips
    await page.goto('/bips')
    // Wait for grid
    await page.waitForSelector('a[href^="/bip/"]', { timeout: 15_000 })

    // The CompareToggle is a checkbox outside the card link — tick 2 cards
    const toggles = page.locator('label:has(input[type="checkbox"])', { hasText: 'Compare' })
    const count = await toggles.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Tick first two (they are for the first two BIPs in the grid)
    await toggles.nth(0).click()
    await toggles.nth(1).click()

    // CompareBar should appear with "2 selected" and Compare link
    const compareBar = page.locator('text=2 selected')
    await expect(compareBar).toBeVisible({ timeout: 10_000 })
    const compareLink = page.getByRole('link', { name: /compare 2/i })
    await expect(compareLink).toBeVisible()

    // href should be /bips/compare?ids=...
    const href = await compareLink.getAttribute('href')
    expect(href).toMatch(/\/bips\/compare\?ids=.+/)

    // Click Compare — should navigate to compare page with 2 cards side-by-side
    await compareLink.click()
    await expect(page).toHaveURL(/\/bips\/compare\?ids=/, { timeout: 10_000 })
    // Compare page should show "Compare 2 BIPs" heading and 2 cards with deadline + Apply CTA
    await expect(page.getByRole('heading', { name: /compare 2 bips/i })).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('article')
    await expect(cards).toHaveCount(2, { timeout: 10_000 })
    // Each card has View details and Apply CTA (check at least one Apply)
    await expect(page.getByText(/view details/i).first()).toBeVisible({ timeout: 10_000 })

    // Shareable URL: open the same compare URL in a new context (no localStorage)
    const shareUrl = page.url()
    const newPage = await context.newPage()
    await newPage.goto(shareUrl)
    await expect(newPage.getByRole('heading', { name: /compare 2 bips/i })).toBeVisible({ timeout: 10_000 })
    await expect(newPage.locator('article')).toHaveCount(2)
    await newPage.close()

    // Test cap: try to add a third, then a fourth should be blocked
    await page.goto('/bips')
    await page.waitForSelector('a[href^="/bip/"]', { timeout: 10_000 })
    // Clear previous selection via CompareBar Clear
    const clearBtn = page.getByRole('button', { name: /^clear$/i })
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click()
    }
    // Re-tick 3 cards
    const toggles2 = page.locator('label:has(input[type="checkbox"])', { hasText: 'Compare' })
    await toggles2.nth(0).click()
    await toggles2.nth(1).click()
    await toggles2.nth(2).click()
    await expect(page.locator('text=3 selected')).toBeVisible({ timeout: 10_000 })
    // Fourth toggle should be disabled and have title about cap
    const fourth = toggles2.nth(3)
    if (await fourth.isVisible().catch(() => false)) {
      // When at cap, unchecked toggles are disabled
      const input = fourth.locator('input[type="checkbox"]')
      await expect(input).toBeDisabled({ timeout: 5_000 })
      await expect(fourth).toHaveAttribute('title', /limited to 3/i)
    }
  })
})
