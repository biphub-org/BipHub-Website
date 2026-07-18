/**
 * BROW-14 — partner-institutions-only badge on /bips cards (Plan 09-09 Task 3).
 *
 * Public /bips listing spec (no storageState — matches the 'public' Playwright
 * project alongside map-filter.spec.ts / no-horizontal-overflow.spec.ts).
 *
 * Anchor choice: this spec deliberately does NOT use the e2e-edit-target-bip
 * fixture (supabase/seed.e2e.sql) even though it also seeds
 * partner_institutions_only=true — that fixture's value is flipped
 * true -> false by bip-edits.spec.ts's per-field edit round-trip test
 * (Plan 09-09 Task 2), and Playwright project execution order between
 * 'admin-authed' and 'public' is not something this spec should depend on.
 * Instead this anchors on the two DEMO-seeded partner_institutions_only=true
 * BIPs from supabase/seed.sql ("Smart Grid Technologies & the Central
 * European Energy Transition" / "Offshore Wind Systems: Design, Maintenance
 * & Marine Ecology", both `approved`/`is_seed=true`), which no spec mutates.
 */
import { test, expect } from '@playwright/test'

const PARTNER_ONLY_SLUG = 'smart-grid-energy-transition-vienna-2025'
const NON_PARTNER_ONLY_SLUG = 'sustainable-cities-smart-mobility-munich-2026'
const BADGE_TEXT = 'Partner institutions only'

test.describe('bips listing — partner-institutions-only badge (BROW-14)', () => {
  test('badge renders only on partner-institutions-only cards', async ({
    page,
  }) => {
    await page.goto('/bips')

    // Positive: the seeded partner-only demo BIP's card shows the badge.
    const partnerOnlyCard = page.locator(`a[href="/bip/${PARTNER_ONLY_SLUG}"]`)
    await expect(partnerOnlyCard).toBeVisible({ timeout: 15_000 })
    await expect(partnerOnlyCard.getByText(BADGE_TEXT)).toBeVisible({
      timeout: 10_000,
    })

    // Negative: a known non-partner-only demo BIP's card does NOT show the
    // badge — proves the badge is conditional, not rendered globally.
    const nonPartnerOnlyCard = page.locator(
      `a[href="/bip/${NON_PARTNER_ONLY_SLUG}"]`,
    )
    await expect(nonPartnerOnlyCard).toBeVisible({ timeout: 10_000 })
    await expect(nonPartnerOnlyCard.getByText(BADGE_TEXT)).not.toBeVisible()

    // Cross-check via counts: fewer badge instances than total cards on the
    // page (badge is conditional across the whole listing, not just these
    // two anchors).
    const totalCards = await page.locator('a[href^="/bip/"]').count()
    const badgeCount = await page.getByText(BADGE_TEXT).count()
    expect(badgeCount).toBeGreaterThan(0)
    expect(badgeCount).toBeLessThan(totalCards)
  })
})
