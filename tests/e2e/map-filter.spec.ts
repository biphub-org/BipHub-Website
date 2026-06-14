/**
 * Map → filter integration spec — Plan 04-07 Task 7 (D-14 map-filter scope).
 *
 * Public-route spec (no storageState). Asserts that homepage map interactions
 * navigate to `/bips?country=<ISO-2>` and the listing reflects the filter.
 *
 * NOTE on country code casing: the plan example showed `country=de` (lower)
 * but the actual implementation in components/home/EuropeMap.tsx navigates
 * with uppercase ISO-2 codes (e.g. `DE`), matching the country.code field in
 * lib/countries.ts. We assert case-insensitively so the spec is robust
 * either way.
 */
import { test, expect } from '@playwright/test'

test.describe('map-to-filter integration', () => {
  test('clicking Germany on the map filters /bips by country', async ({
    page,
  }) => {
    await page.goto('/')
    // EuropeMapWrapper is IntersectionObserver-gated (defers the 1.2MB d3-geo
    // chunk for perf) — scroll the #by-country section into view to trigger
    // the dynamic import, then wait for the choropleth to hydrate.
    await page.locator('#by-country').scrollIntoViewIfNeeded()
    await page
      .getByRole('application', { name: /choropleth map/i })
      .waitFor({ state: 'visible', timeout: 15_000 })

    // Each country renders as <Geography role="button" aria-label="Germany: N BIPs">.
    // Locate by aria-label.
    const germany = page.getByRole('button', { name: /^Germany:.*BIPs?$/i })
    await germany.scrollIntoViewIfNeeded()
    await germany.click()

    await page.waitForURL(/\/bips\?country=de/i, { timeout: 10_000 })
    // Filter chip / sidebar header reflects "Germany".
    await expect(page.getByText(/germany/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  // LOCAL-ONLY TEST LIMITATION — BIPS-NAV-BUG (see .planning/v1.0-MILESTONE-AUDIT.md).
  // This skip is NOT a product bug: deployed Vercel /bips filters work (user-
  // confirmed 2026-06-14). It is an artifact of running the E2E suite against a
  // LOCAL `next build && next start` server, where router.push()/replace() to the
  // SAME pathname (filter chip, "Clear all", search, sort, pagination) no-ops the
  // /bips RSC re-render — but Vercel's runtime handles it correctly. Cross-pathname
  // nav works locally (the test above passes), so only same-pathname filter
  // interactions are unverifiable in the local prod harness. Keep fixme until the
  // suite can run against a Vercel-equivalent runtime (or `next dev`).
  test.fixme('clearing the country filter returns to /bips', async ({ page }) => {
    await page.goto('/bips?country=DE')
    await page.getByRole('button', { name: 'Germany Remove filter' }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.has('country'), {
        timeout: 10_000,
      })
      .toBe(false)
    await expect(
      page.getByRole('button', { name: 'Germany Remove filter' }),
    ).toHaveCount(0)
  })
})
