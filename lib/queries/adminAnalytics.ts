/**
 * Admin analytics aggregates (D-20 / ADMN-07) — seed-inclusive.
 *
 * Three stat cards on /admin/analytics (includes seed/demo data per request):
 *   1. Total BIPs        — count(bips) ALL rows (seed + real)
 *   2. Submissions/month — count(bip_status_history) where action_kind='submit'
 *                          AND created_at >= start-of-month (covers all BIPs)
 *   3. Top 5 countries   — host_university.country tally over ALL approved
 *                          BIPs, desc by count, limit 5
 *
 * Auth: getClaims() validates the JWT signature (CLAUDE.md never-do
 *   forbids the unvalidated session reader server-side).
 *
 * Client: anon-key `createClient` from `lib/supabase/server`. The admin
 *   RLS clause grants the admin role full visibility, so the service-role
 *   bypass is unnecessary AND would violate the CLAUDE.md scope rule
 *   (the service-role client is restricted to app/(admin)/ and
 *   lib/supabase/admin.ts; this file lives in lib/queries/).
 *
 * Performance: three round-trips total. The country tally is grouped in
 *   JS because PostgREST doesn't expose `group by` aggregates; acceptable
 *   for v1's <500-BIP scale per `.planning/research/SUMMARY.md`.
 */
import { createClient } from '@/lib/supabase/server'
import { ERASMUS_COUNTRIES, getCountryName } from '@/lib/countries'

export type AdminAnalytics = {
  totalBips: number
  submissionsThisMonth: number
  topCountries: Array<{
    country: string
    code: string
    count: number
  }>
}

function startOfMonthIso(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  return start.toISOString()
}

function lookupCountry(code: string): { name: string } {
  const upper = code.toUpperCase()
  const known = ERASMUS_COUNTRIES.find((c) => c.code === upper)
  return {
    name: known?.name ?? getCountryName(upper),
  }
}

type CountryJoinRow = {
  host_university:
    | { country: string | null }
    | Array<{ country: string | null }>
    | null
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  if (!authData?.claims?.sub) {
    return { totalBips: 0, submissionsThisMonth: 0, topCountries: [] }
  }

  // 1. Total BIPs — all rows including seed/demo data
  const totalRes = await supabase
    .from('bips')
    .select('id', { count: 'exact', head: true })
  const totalBips = totalRes.count ?? 0

  // 2. Submissions this month via bip_status_history audit log
  const monthRes = await supabase
    .from('bip_status_history')
    .select('id', { count: 'exact', head: true })
    .eq('action_kind', 'submit')
    .gte('created_at', startOfMonthIso())
  const submissionsThisMonth = monthRes.count ?? 0

  // 3. Top 5 host countries (all approved BIPs including seed, grouped JS-side)
  const { data: countryRows, error: countryError } = await supabase
    .from('bips')
    .select('host_university:host_university_id ( country )')
    .eq('status', 'approved')

  let topCountries: AdminAnalytics['topCountries'] = []
  if (!countryError && countryRows) {
    const tally = new Map<string, number>()
    for (const row of countryRows as unknown as CountryJoinRow[]) {
      const hu = Array.isArray(row.host_university)
        ? row.host_university[0]
        : row.host_university
      const code = hu?.country
      if (!code) continue
      tally.set(code, (tally.get(code) ?? 0) + 1)
    }
    topCountries = Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => {
        const { name } = lookupCountry(code)
        return { country: name, code, count }
      })
  } else if (countryError) {
    console.error('[getAdminAnalytics] top-countries error:', countryError.message)
  }

  return { totalBips, submissionsThisMonth, topCountries }
}
