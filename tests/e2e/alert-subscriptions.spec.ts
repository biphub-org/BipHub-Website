/**
 * Alert Subscriptions E2E — preferences model (ALRT-01..09, FOUN-11..13).
 *
 * Rewritten 2026-09-03: the single-subscription dropdown UI was replaced by
 * AlertPreferencesForm (checkbox groups for countries/fields/ISCED +
 * frequency radios + one Apply button, backed by a single
 * bip_alert_preferences row per user). The 5-subscription cap (ALRT-09) no
 * longer exists — "No limits" per the dashboard copy — so the cap test was
 * replaced with an empty-selection validation test.
 */
import { createHmac } from 'node:crypto'
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

async function getUserId(page: Page, email: string, password: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const tokenResp = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    data: { email, password },
  })
  expect(tokenResp.ok()).toBeTruthy()
  const session = await tokenResp.json()
  return JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString()).sub as string
}

function serviceHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
}

async function cleanupPreferences(page: Page): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const userId = await getUserId(page, STUDENT_EMAIL, STUDENT_PASSWORD)
  const del = await page.request.delete(`${supabaseUrl}/rest/v1/bip_alert_preferences?user_id=eq.${userId}`, {
    headers: serviceHeaders(),
  })
  expect(del.ok()).toBeTruthy()
}

/**
 * Mint a preferences-model unsubscribe token (userId:userId HMAC), mirroring
 * lib/constants/unsubscribe.ts. Uses the same secret chain, so it verifies
 * whenever the server uses its default (both unset in CI).
 */
function mintUnsubscribeToken(userId: string): string {
  const secret =
    process.env.UNSUBSCRIBE_HMAC_SECRET ?? process.env.CRON_SECRET ?? 'dev-only-secret-change-me'
  const hmac = createHmac('sha256', secret).update(`${userId}:${userId}`).digest()
  const b64 = hmac.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  const payload = `${userId}.${b64}`
  return Buffer.from(payload).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

test.describe('alert subscriptions', () => {
  test.beforeEach(async ({ page }) => {
    await signInStudent(page)
    await cleanupPreferences(page)
    await page.goto('/student-dashboard')
  })

  test('student can save, change frequency, and clear preferences', async ({ page }) => {
    const medicine = page.getByRole('checkbox', { name: 'Medicine', exact: true })
    const austria = page.getByRole('checkbox', { name: 'Austria' })
    const apply = page.getByRole('button', { name: 'Apply', exact: true })
    await medicine.check()
    await austria.check()
    await apply.click()
    await expect(page.getByText('Alert preferences saved')).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page.getByRole('checkbox', { name: 'Medicine', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Austria' })).toBeChecked()

    // Frequency edit: daily persists across reload.
    await page.getByRole('radio', { name: 'Daily' }).check()
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByText('Alert preferences saved')).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeChecked()

    // Clear removes the whole preferences row.
    await page.getByRole('button', { name: 'Clear alerts' }).click()
    await expect(page.getByText('Alerts cleared')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('checkbox', { name: 'Medicine', exact: true })).not.toBeChecked()
  })

  test('empty selection shows validation error (no cap in preferences model)', async ({ page }) => {
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByText('Choose at least one field')).toBeVisible({ timeout: 10_000 })
  })

  test('no-login unsubscribe via signed token (ALRT-05/06)', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    await page.getByRole('checkbox', { name: 'Medicine', exact: true }).check()
    await page.getByRole('checkbox', { name: 'Austria' }).check()
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByText('Alert preferences saved')).toBeVisible({ timeout: 10_000 })

    const userId = await getUserId(page, STUDENT_EMAIL, STUDENT_PASSWORD)
    const badResp = await page.request.get('/api/unsubscribe?token=invalid')
    expect(badResp.status()).toBe(403)

    const token = mintUnsubscribeToken(userId)
    const resp = await page.request.get(`/api/unsubscribe?token=${token}`)
    expect(resp.status()).toBe(200)
    expect(await resp.text()).toContain('Unsubscribed')

    const check = await page.request.get(`${supabaseUrl}/rest/v1/bip_alert_preferences?user_id=eq.${userId}&select=user_id`, {
      headers: serviceHeaders(),
    })
    expect(await check.json()).toHaveLength(0)
  })

  test('GDPR cascade delete removes preferences (FOUN-12) — throwaway user', async ({ page, context }) => {
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
    await throwawayPage.getByRole('checkbox', { name: 'Medicine', exact: true }).check()
    await throwawayPage.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(throwawayPage.getByText('Alert preferences saved')).toBeVisible({ timeout: 10_000 })
    const check1 = await page.request.get(`${supabaseUrl}/rest/v1/bip_alert_preferences?user_id=eq.${throwawayId}&select=user_id`, {
      headers: serviceHeaders(),
    })
    expect((await check1.json()).length).toBe(1)
    const delUserResp = await page.request.delete(`${supabaseUrl}/auth/v1/admin/users/${throwawayId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    expect(delUserResp.ok()).toBeTruthy()
    await expect(async () => {
      const check2 = await page.request.get(`${supabaseUrl}/rest/v1/bip_alert_preferences?user_id=eq.${throwawayId}&select=user_id`, {
        headers: serviceHeaders(),
      })
      expect(await check2.json()).toHaveLength(0)
    }).toPass({ timeout: 10_000 })
    await throwawayPage.close()
  })
})
