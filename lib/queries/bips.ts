import { createClient } from '@/lib/supabase/server'
import { applyFilters } from '@/lib/filters/buildSupabaseQuery'
import type { BipFilterState } from '@/lib/filters/parseSearchParams'
import type { Bip, BipWithRelations } from '@/lib/types/bip'

export type BipsQueryResult = {
  rows: BipWithRelations[]
  total: number          // total matching rows (for pagination + count line)
  totalCountries: number // distinct countries in CURRENT filtered result (for hero lede)
}

/**
 * Fetch BIPs for /bips with all filters applied. Single PostgREST query with
 * relational embedding for host_university (PITFALLS Pitfall 21).
 *
 * RLS enforces status='approved' for anon; we still pass it via filter for admin
 * (Phase 3) to override.
 */
export async function getBips(filters: BipFilterState): Promise<BipsQueryResult> {
  const supabase = await createClient()

  // When filtering by country, use !inner so PostgREST returns the host_university
  // object instead of nulling it out on matched rows (embedded filter behaviour).
  const universityJoin = filters.country?.length
    ? 'host_university:universities!host_university_id!inner(id, name, country, city, erasmus_code)'
    : 'host_university:universities!host_university_id(id, name, country, city, erasmus_code)'

  const baseSelect = `
    id, slug, title, application_deadline, ects_credits, language_of_instruction,
    physical_start_date, physical_end_date, host_city, study_levels,
    green_travel, inclusion_support, is_seed, status, created_at, subject_areas,
    partner_institutions_only, card_image_path,
    ${universityJoin}
  `

  const query = supabase
    .from('bips')
    .select(baseSelect, { count: 'exact' })

  const { data, error, count } = await applyFilters(query, filters)

  if (error) {
    // Dev: degrade gracefully when local Supabase is down (Docker not running)
    // so the page still renders. Prod: throw so real outages surface in error.tsx
    // and Sentry/logs instead of silently caching an empty page via ISR.
    if (process.env.NODE_ENV !== 'production') {
      console.error('[getBips] query failed, returning empty result:', error)
      return { rows: [], total: 0, totalCountries: 0 }
    }
    throw error
  }

  // Distinct country count from CURRENT filtered set
  const rawRows = (data ?? []) as unknown as Array<
    Bip & { host_university: BipWithRelations['host_university'] }
  >

  const totalCountries = new Set(
    rawRows.map((b) => b.host_university?.country).filter(Boolean),
  ).size

  return {
    rows: rawRows.map((row) => ({
      ...row,
      host_university: row.host_university ?? null,
      partners: [],
    })) as BipWithRelations[],
    total: count ?? 0,
    totalCountries,
  }
}

/**
 * Lightweight count helper for the mobile drawer's "Show {n} results" button.
 * RSC-callable.
 */
export async function countBips(filters: BipFilterState): Promise<number> {
  const supabase = await createClient()
  const query = supabase.from('bips').select('id', { count: 'exact', head: true })
  const { count, error } = await applyFilters(query, filters)
  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[countBips] query failed, returning 0:', error)
      return 0
    }
    throw error
  }
  return count ?? 0
}
