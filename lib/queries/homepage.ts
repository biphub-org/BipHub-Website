/**
 * Server-side RSC data fetchers for the homepage (DISC-01..07).
 *
 * Each function takes a pre-created Supabase client (created once per request
 * in the page RSC and shared across queries). This avoids the overhead of
 * creating multiple clients per request.
 *
 * All queries explicitly filter to status='approved' — RLS enforces this for
 * anon requests, but explicit filtering provides defense-in-depth per T-05-04.
 *
 * Single PostgREST queries with relational embedding (PITFALLS Pitfall 21).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { Bip, BipWithRelations } from '@/lib/types/bip'
import { ERASMUS_COUNTRY_CODES } from '@/lib/countries'

type SbClient = SupabaseClient<Database>

/**
 * Returns the count of approved BIPs.
 * Used by RecentBips to gate the ≥6-BIP threshold (DISC-05).
 */
export async function getApprovedBipCount(supabase: SbClient): Promise<number> {
  const { count } = await supabase
    .from('bips')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
  return count ?? 0
}

/**
 * Returns a map of ISO alpha-2 country code → BIP count.
 * Used by the EuropeMap choropleth (DISC-02).
 *
 * All Erasmus+ country codes are pre-populated to 0 so the choropleth
 * always has a value for every country (avoids undefined lookups).
 */
export async function getBipCountsByCountry(
  supabase: SbClient,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('bips')
    .select('host_university:universities!host_university_id(country)')
    .eq('status', 'approved')

  // Pre-populate all Erasmus+ country codes to 0
  const counts: Record<string, number> = {}
  for (const code of ERASMUS_COUNTRY_CODES) {
    counts[code] = 0
  }

  for (const row of data ?? []) {
    const country = (row as unknown as { host_university: { country: string } | null })
      .host_university?.country
    if (country) {
      counts[country] = (counts[country] ?? 0) + 1
    }
  }

  return counts
}

/**
 * Returns a map of ISCED field id → BIP count.
 * Used by the CategoriesBar (DISC-03).
 */
export async function getBipCountsByField(
  supabase: SbClient,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('bips')
    .select('subject_areas')
    .eq('status', 'approved')

  // A multi-field BIP counts once under EACH of its fields.
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    for (const sa of row.subject_areas ?? []) {
      if (sa) counts[sa] = (counts[sa] ?? 0) + 1
    }
  }
  return counts
}

/**
 * Returns up to `limit` most-recently-created approved BIPs with host university.
 * Single PostgREST query with relational embedding (Pitfall 21).
 *
 * partners is empty here — Plan 01-07 extends to fetch partners on the detail page only.
 */
export async function getRecentBips(
  supabase: SbClient,
  limit: number,
): Promise<BipWithRelations[]> {
  const { data } = await supabase
    .from('bips')
    .select(`
      *,
      host_university:universities!host_university_id(id, name, country, city, erasmus_code)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => ({
    ...(row as unknown as Bip),
    host_university: (
      row as unknown as { host_university: BipWithRelations['host_university'] }
    ).host_university ?? null,
    partners: [], // Plan 01-07 extends partner fetching for detail page
  }))
}

/**
 * Returns live stats for the StatsSection (DISC-04).
 *
 * Uses Promise.all for parallel queries (performance).
 * Countries count is derived from the distinct countries of approved BIPs' host universities.
 */
export async function getStatsSnapshot(supabase: SbClient): Promise<{
  bipsListed: number
  universities: number
  countries: number
  openApplications: number
}> {
  const today = new Date().toISOString().slice(0, 10)

  const [bipsRes, unisRes, openRes] = await Promise.all([
    supabase
      .from('bips')
      .select('host_university:universities!host_university_id(country)', { count: 'exact' })
      .eq('status', 'approved'),
    supabase
      .from('universities')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('bips')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('application_deadline', today),
  ])

  // Derive unique country count from host universities of approved BIPs
  const countries = new Set(
    (bipsRes.data ?? []).map(
      (r) =>
        (r as unknown as { host_university: { country: string } | null }).host_university?.country,
    ).filter(Boolean),
  )

  return {
    bipsListed: bipsRes.count ?? 0,
    universities: unisRes.count ?? 0,
    countries: countries.size,
    openApplications: openRes.count ?? 0,
  }
}
