import { test, expect } from '@playwright/test'

test('verify draft listed under My BIPs and Add new BIP is blank', async ({ page }) => {
  const draftTitle = `Verify Draft ${Date.now()}`
  const draftBipId = `BIP-VERIFY-${Date.now().toString().slice(-6)}`
  page.on('console', msg => console.log(`BROWSER_CONSOLE ${msg.text()}`))

  // 1. Fresh Add new BIP should be blank - BIP title, BIP ID, target group
  await page.goto('/dashboard/bips/new')
  await expect(page.getByText(/Step 1 of 5/i)).toBeVisible({ timeout: 15000 })
  const titleInput = page.getByLabel(/BIP title/i)
  const bipIdInput = page.getByLabel(/^BIP ID$/i)
  const targetGroupSelect = page.getByLabel(/Target group/i)
  await expect(titleInput).toBeVisible({ timeout: 10000 })
  await expect(bipIdInput).toBeVisible({ timeout: 10000 })
  await expect(targetGroupSelect).toBeVisible({ timeout: 10000 })
  await expect(titleInput).toHaveValue('', { timeout: 5000 })
  await expect(bipIdInput).toHaveValue('', { timeout: 5000 })
  await expect(targetGroupSelect).toHaveValue('', { timeout: 5000 })
  await page.screenshot({ path: 'test-results/verify-01-fresh-blank.png', fullPage: true })

  // 2. Fill BIP title, BIP ID, target group and trigger autosave
  await titleInput.fill(draftTitle)
  await titleInput.blur()
  await bipIdInput.fill(draftBipId)
  await bipIdInput.blur()
  await targetGroupSelect.selectOption('students')
  await page.waitForTimeout(500)
  await targetGroupSelect.blur()
  await page.waitForTimeout(2500)
  const beforeReload = await page.evaluate(() => localStorage.getItem('biphub:draft'))
  console.log(`BEFORE_RELOAD len ${beforeReload?.length ?? 0} hasBipId ${beforeReload?.includes('bipId')}`)
  console.log(`BEFORE_RELOAD raw ${beforeReload?.slice(0,600)}`)

  // 3. Refresh the new page - should still show the draft being edited (not blank)
  await page.reload()
  await expect(page.getByText(/Step 1 of 5/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByLabel(/BIP title/i)).toHaveValue(draftTitle, { timeout: 5000 })
  await expect(page.getByLabel(/^BIP ID$/i)).toHaveValue(draftBipId, { timeout: 5000 })
  await expect(page.getByLabel(/Target group/i)).toHaveValue('students', { timeout: 5000 })
  await page.screenshot({ path: 'test-results/verify-02-refresh-resume.png', fullPage: true })
  // Update target group to test step navigation persistence
  await page.getByLabel(/Target group/i).selectOption('students_staff')
  await page.waitForTimeout(2500)

  // 4. Navigate to My BIPs dashboard - draft should appear in All and Draft tabs
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /Your BIPs/i })).toBeVisible({ timeout: 10000 })
  await expect(page.getByText(draftTitle).first()).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: 'test-results/verify-03-dashboard-all.png', fullPage: true })

  const draftTab = page.getByRole('tab', { name: /Draft/i })
  if (await draftTab.isVisible()) {
    await draftTab.click()
    await expect(page.getByText(draftTitle).first()).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'test-results/verify-04-dashboard-draft.png', fullPage: true })
    const allTab = page.getByRole('tab', { name: /^All$/i })
    if (await allTab.isVisible()) await allTab.click()
  }

  // 5. Verify Add new BIP is blank after navigating from dashboard (fresh navigation, not reload)
  await page.getByRole('link', { name: /Submit a BIP/i }).first().click()
  await page.waitForURL(/\/dashboard\/bips\/new/, { timeout: 10000 })
  await expect(page.getByText(/Step 1 of 5/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByLabel(/BIP title/i)).toHaveValue('', { timeout: 5000 })
  await expect(page.getByLabel(/^BIP ID$/i)).toHaveValue('', { timeout: 5000 })
  await expect(page.getByLabel(/Target group/i)).toHaveValue('', { timeout: 5000 })
  const saveContinue = page.getByRole('button', { name: /Save.*continue/i })
  await expect(saveContinue).toBeVisible({ timeout: 5000 })
  await page.screenshot({ path: 'test-results/verify-05-add-new-blank.png', fullPage: true })

  // 6. Verify Edit from My BIPs resumes correctly with all fields
  await page.goto('/dashboard')
  await expect(page.getByText(draftTitle).first()).toBeVisible({ timeout: 10000 })
  // Click this draft's own Edit link (known bipId from autosave), not the
  // page-first one — the dashboard also lists seeded fixture BIPs.
  const { bipId: savedBipId } = JSON.parse(beforeReload as string)
  const editLink = page.locator(`a[href="/dashboard/bips/${savedBipId}/edit"]`)
  await expect(editLink).toBeVisible({ timeout: 5000 })
  await editLink.click()
  await page.waitForURL(/\/dashboard\/bips\/.*\/edit/, { timeout: 10000 })
  await expect(page.getByLabel(/BIP title/i)).toHaveValue(draftTitle, { timeout: 10000 })
  await expect(page.getByLabel(/^BIP ID$/i)).toHaveValue(draftBipId, { timeout: 10000 })
  await expect(page.getByLabel(/Target group/i)).toHaveValue('students_staff', { timeout: 5000 })
  await page.screenshot({ path: 'test-results/verify-06-edit-resume.png', fullPage: true })

  // 7. Multi-frame responsiveness (4 distinct controls already exercised) + FPS
  await page.goto('/dashboard')
  await expect(page.getByText(draftTitle).first()).toBeVisible({ timeout: 10000 })
  const fps = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let frames = 0
      const start = performance.now()
      function tick() {
        frames++
        if (performance.now() - start < 1000) requestAnimationFrame(tick)
        else resolve(frames)
      }
      requestAnimationFrame(tick)
    })
  })
  console.log(`FPS sample: ${fps}`)
  expect(fps).toBeGreaterThan(10)
  await page.screenshot({ path: 'test-results/verify-draft-my-bips.png', fullPage: true })
})
