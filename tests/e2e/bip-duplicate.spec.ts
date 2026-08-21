/**
 * Phase 12 — Duplicate BIP + Edition N (SUBM-15/16, FOUN-15)
 *
 * Covers:
 *  1. Edition badge on public detail page — derived via duplicated_from_bip_id
 *     chain. /bip/e2e-edition-copy (approved, duplicated_from=e2e-edit-target-bip)
 *     renders "Edition 2", while the source /bip/e2e-edit-target-bip renders no
 *     badge (edition=1). The demo seed chain (alpine-climate-resilience → sustainable-cities)
 *     is also exercised via the public /bips → detail path when available.
 *  2. Coordinator duplicate affordance — an approved BIP's dashboard card shows
 *     a "Duplicate" button that creates a new draft with the same content,
 *     regenerated slug, and duplicated_from_bip_id lineage, then navigates to
 *     the wizard edit route. Uses the coordinator-authed storageState so
 *     /dashboard is reachable.
 *
 * Idempotency: the duplicated draft is cleaned by the outer seed.e2e.sql
 * delete-first (where created_by in @biphub.test) on the next `supabase db reset`
 * / seed-cloud-e2e.mjs run, so no explicit teardown is needed. The edition-copy
 * fixture itself is part of the seed and is idempotent.
 */
import { test, expect } from '@playwright/test'

const EDITION_COPY_SLUG = 'e2e-edition-copy'
const EDIT_TARGET_SLUG = 'e2e-edit-target-bip'
const DEMO_SOURCE_SLUG = 'sustainable-cities-smart-mobility-munich-2026'
const DEMO_EDITION_SLUG = 'alpine-climate-resilience-munich-2026'

test.describe('duplicate + edition (SUBM-15/16)', () => {
  test('public detail shows Edition 2 for duplicated BIP, no badge for original', async ({
    page,
  }) => {
    // Source (edition 1) — no badge
    await page.goto(`/bip/${EDIT_TARGET_SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Edition 2')).not.toBeVisible()
    // Also ensure no Edition 1 is rendered (badge only when >1)
    await expect(page.getByText(/^Edition \d+$/)).not.toBeVisible()

    // Copy (edition 2) — badge visible
    await page.goto(`/bip/${EDITION_COPY_SLUG}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    const badge = page.getByText('Edition 2')
    await expect(badge).toBeVisible({ timeout: 10_000 })
    await expect(badge).toHaveAttribute('aria-label', 'Edition 2')
  })

  test('demo seed chain renders Edition 2 when demo seed is present', async ({ page }) => {
    // This test is best-effort: if the demo seed chain (alpine → sustainable)
    // is present (local `supabase db reset` with seed.sql), the duplicate
    // should show Edition 2; if not (cloud E2E without demo seed), skip.
    await page.goto(`/bip/${DEMO_EDITION_SLUG}`)
    // If the slug doesn't resolve (no demo seed in cloud), skip instead of failing.
    const heading = page.getByRole('heading', { level: 1 })
    const isFound = await heading.isVisible().catch(() => false)
    if (!isFound) {
      test.skip(true, 'Demo seed not present in this env — skipping demo chain check')
      return
    }
    await expect(page.getByText('Edition 2')).toBeVisible({ timeout: 10_000 })
    await page.goto(`/bip/${DEMO_SOURCE_SLUG}`)
    await expect(page.getByText(/^Edition \d+$/)).not.toBeVisible()
  })

  test('coordinator can duplicate an approved BIP into a new draft', async ({ page }) => {
    await page.goto('/dashboard')

    // Find the approved card for the edit-target BIP (known title, stable)
    const approvedTab = page.getByRole('tab', { name: /approved/i })
    // Dashboard may default to a different tab; ensure Approved is active
    if (await approvedTab.isVisible().catch(() => false)) {
      await approvedTab.click()
    }

    const sourceCard = page.locator('article', { hasText: 'E2E Edit Target BIP' }).first()
    await expect(sourceCard).toBeVisible({ timeout: 15_000 })

    const duplicateBtn = sourceCard.getByRole('button', { name: /duplicate/i })
    await expect(duplicateBtn).toBeVisible({ timeout: 10_000 })
    await expect(duplicateBtn).toBeEnabled()

    // Click duplicate — expect navigation to new draft edit route
    await duplicateBtn.click()

    // Either goes to /dashboard/bips/<uuid>/edit or shows a toast on error
    await expect(page).toHaveURL(/\/dashboard\/bips\/[a-f0-9-]+\/edit/, { timeout: 15_000 })

    // Wizard Step 1 should be prefilled with the source title
    await expect(page.getByRole('heading', { name: /bip title|basic information/i }).first()).toBeVisible({
      timeout: 10_000,
    })
    const titleInput = page.getByLabel(/bip title/i)
    await expect(titleInput).toBeVisible({ timeout: 10_000 })
    await expect(titleInput).toHaveValue('E2E Edit Target BIP', { timeout: 10_000 })

    // Extract the new draft id from URL and verify it appears in Drafts tab
    const url = page.url()
    const match = url.match(/\/dashboard\/bips\/([a-f0-9-]+)\/edit/)
    expect(match).not.toBeNull()
    const newId = match![1]

    // Navigate back to dashboard drafts and assert the duplicate row exists
    await page.goto('/dashboard')
    const draftTab = page.getByRole('tab', { name: /draft/i })
    if (await draftTab.isVisible().catch(() => false)) {
      await draftTab.click()
    }
    const draftCard = page.locator(`a[href="/dashboard/bips/${newId}/edit"]`)
    // The draft card may be rendered as article with Edit link; fallback to article text
    const draftByTitle = page.locator('article', { hasText: 'E2E Edit Target BIP' })
    await expect(draftCard.or(draftByTitle).first()).toBeVisible({ timeout: 15_000 })

    // Cleanup best-effort: delete the duplicate draft so repeated local runs
    // without a db reset don't accumulate. The outer seed cleanup also handles this.
    const draftArticle = page.locator('article', { hasText: 'E2E Edit Target BIP' }).first()
    const deleteBtn = draftArticle.getByRole('button', { name: /delete/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.getByRole('button', { name: /delete|confirm/i })
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click()
        await expect(draftArticle).not.toBeVisible({ timeout: 10_000 }).catch(() => {})
      }
    }
  })
})
