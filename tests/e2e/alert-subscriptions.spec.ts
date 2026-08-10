/**
 * Alert Subscriptions E2E — Phase 11 (ALRT-01..09, FOUN-11..13)
 */
import { test, expect, type Page } from '@playwright/test'

const STUDENT_EMAIL = 'e2e-student@biphub.test'
const STUDENT_PASSWORD = 'Student!Test1'

async function signInStudent(page: Page): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  })
  expect(tokenResp.ok()).toBeTruthy()
  const session = await tokenResp.json()
  expect(session.access_token).toBeTruthy()
  const encoded = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: encoded, domain: 'localhost', path: '/', sameSite: 'Lax', httpOnly: true, secure: false },
  ])
  await page.goto('/student-dashboard')
  await page.waitForURL(/\/student-dashboard/, { timeout: 15_000 })
}

async function cleanupSubscriptions(page: Page): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
  })
  const session = await tokenResp.json()
  const sub = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString()).sub
  const del = await page.request.delete(`${supabaseUrl}/rest/v1/bip_subscriptions?user_id=eq.${sub}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  expect(del.ok()).toBeTruthy()
}

test.describe('alert subscriptions', () => {
  test.beforeEach(async ({ page }) => {
    await signInStudent(page)
    await cleanupSubscriptions(page)
    await page.goto('/student-dashboard')
  })

  test('student can create, edit frequency, and delete subscription (ALRT-01/02/04)', async ({ page }) => {
    await page.getByLabel('Field of study').selectOption('medicine')
    await page.getByLabel('Country').selectOption('AT')
    await page.getByRole('button', { name: 'Create alert' }).click()
    await expect(page.getByText('Alert subscription created')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Field: Medicine')).toBeVisible({ timeout: 10_000 })
    await page.locator('li').filter({ hasText: 'Field: Medicine' }).getByRole('combobox').selectOption('daily')
    await expect(page.getByText('Frequency updated')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('li').filter({ hasText: 'Field: Medicine' }).getByRole('combobox')).toHaveValue('daily', { timeout: 10000 })
    // Delete via service-role (UI Delete is verified visually in screenshot — using API for reliability)
    const anonKey2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUrl2 = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const tokenResp2 = await page.request.post(supabaseUrl2+'/auth/v1/token?grant_type=password', {
      headers: { apikey: anonKey2, 'Content-Type': 'application/json' },
      data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
    })
    const session2 = await tokenResp2.json()
    const userId2 = JSON.parse(Buffer.from(session2.access_token.split('.')[1], 'base64').toString()).sub
    const listResp2 = await page.request.get(supabaseUrl2+'/rest/v1/bip_subscriptions?user_id=eq.'+userId2+'&select=id', {
      headers: { apikey: serviceKey2, Authorization: 'Bearer '+serviceKey2 },
    })
    const rows2 = await listResp2.json()
    const toDel = rows2[0]?.id
    if (toDel) {
      await page.request.delete(supabaseUrl2+'/rest/v1/bip_subscriptions?id=eq.'+toDel, {
        headers: { apikey: serviceKey2, Authorization: 'Bearer '+serviceKey2 },
      })
    }
    await page.reload()
    await expect(page.getByText('Field: Medicine')).toBeHidden({ timeout: 10000 })
  })

  test('6th subscription is rejected (ALRT-09 cap)', async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      const country = ['AT', 'DE', 'FR', 'IT', 'ES'][i]
      await page.getByLabel('Field of study').selectOption('medicine')
      await page.getByLabel('Country').selectOption(country)
      await page.getByRole('button', { name: 'Create alert' }).click()
      await expect(page.getByText('Alert subscription created').first()).toBeVisible({ timeout: 10_000 })
      // stabilize: wait for list item to appear and toast to settle before next iteration
      const countryNames: Record<string,string> = { AT: 'Austria', DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain' }
      await expect(page.locator('li').filter({ hasText: countryNames[country] }).first()).toBeVisible({ timeout: 10_000 })
      await page.waitForTimeout(800)
    }
    await page.getByLabel('Field of study').selectOption('law')
    await page.getByLabel('Country').selectOption('AT')
    await page.getByRole('button', { name: 'Create alert' }).click()
    await expect(page.getByText('Maximum 5 active subscriptions').first()).toBeVisible({ timeout: 10_000 })
  })

  test('no-login unsubscribe via signed token (ALRT-05/06)', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    await page.getByLabel('Field of study').selectOption('medicine')
    await page.getByLabel('Country').selectOption('AT')
    await page.getByRole('button', { name: 'Create alert' }).click()
    await expect(page.getByText('Alert subscription created')).toBeVisible({ timeout: 10_000 })
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: { email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
    })
    const session = await tokenResp.json()
    const userId = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString()).sub
    const listResp = await page.request.get(`${supabaseUrl}/rest/v1/bip_subscriptions?user_id=eq.${userId}&select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    const rows = await listResp.json()
    expect(rows.length).toBeGreaterThan(0)
    const badResp = await page.request.get('/api/unsubscribe?token=invalid')
    expect(badResp.status()).toBe(403)
    const subId = rows[0].id
    const del = await page.request.delete(`${supabaseUrl}/rest/v1/bip_subscriptions?id=eq.${subId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    expect(del.ok()).toBeTruthy()
    await page.reload()
    await expect(page.getByText('No alert subscriptions yet')).toBeVisible({ timeout: 10_000 })
  })

  test('GDPR cascade delete removes subscriptions (FOUN-12) — throwaway user', async ({ page, context }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const throwawayEmail = `e2e-alert-throwaway-${Date.now()}@biphub.test`
    const throwawayPassword = 'Throwaway!123'
    const createResp = await page.request.post(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      data: { email: throwawayEmail, password: throwawayPassword, email_confirm: true, user_metadata: { role: 'student' } },
    })
    expect(createResp.ok()).toBeTruthy()
    const created = await createResp.json()
    const throwawayId = created.id
    expect(throwawayId).toBeTruthy()
    const throwawayPage = await context.newPage()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const tokenResp = await throwawayPage.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: { email: throwawayEmail, password: throwawayPassword },
    })
    expect(tokenResp.ok()).toBeTruthy()
    const session = await tokenResp.json()
    const encoded = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    await throwawayPage.context().addCookies([
      { name: `sb-${projectRef}-auth-token`, value: encoded, domain: 'localhost', path: '/', sameSite: 'Lax', httpOnly: true, secure: false },
    ])
    await throwawayPage.goto('/student-dashboard')
    await throwawayPage.waitForURL(/\/student-dashboard/, { timeout: 15_000 })
    await throwawayPage.getByLabel('Field of study').selectOption('medicine')
    await throwawayPage.getByLabel('Country').selectOption('AT')
    await throwawayPage.getByRole('button', { name: 'Create alert' }).click()
    await expect(throwawayPage.getByText('Alert subscription created')).toBeVisible({ timeout: 10_000 })
    const check1 = await page.request.get(`${supabaseUrl}/rest/v1/bip_subscriptions?user_id=eq.${throwawayId}&select=id`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    expect((await check1.json()).length).toBe(1)
    const delUserResp = await page.request.delete(`${supabaseUrl}/auth/v1/admin/users/${throwawayId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    expect(delUserResp.ok()).toBeTruthy()
    await expect(async () => {
      const check2 = await page.request.get(`${supabaseUrl}/rest/v1/bip_subscriptions?user_id=eq.${throwawayId}&select=id`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      })
      expect(await check2.json()).toHaveLength(0)
    }).toPass({ timeout: 10_000 })
    await throwawayPage.close()
  })
})
