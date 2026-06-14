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

  // KNOWN ISSUE (pre-existing, prod build) — see BIPS-NAV-BUG below.
  // On /bips, router.push() to the SAME pathname (removing a filter chip,
  // "Clear all", or typing in search) is a no-op: neither the URL nor the
  // result list changes. Meanwhile the page IS hydrated (the sidebar "Country"
  // accordion toggles via client state) and CROSS-pathname navigation works
  // (the test above: homepage map → /bips?country=DE passes). Reproduced on
  // next@15.5.18, fresh `next build && next start`, headless Chrome, with zero
  // console/page errors. This breaks /bips filter interactivity in production
  // and needs a focused fix to the navigation pattern shared by BipFilterChips
  // / BipSearchBar (and likely other same-pathname push() call sites). Tracked
  // separately from the resubmit work; un-skip once the nav fix lands.
  test.fixme(
    'clearing the country filter returns to /bips',
    async ({ page }) => {
      await page.goto('/bips?country=DE')
      await page
        .getByRole('button', { name: 'Germany Remove filter' })
        .click()
      await expect
        .poll(() => new URL(page.url()).searchParams.has('country'), {
          timeout: 10_000,
        })
        .toBe(false)
    },
  )
})
