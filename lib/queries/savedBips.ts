/**
 * Saved-BIPs query layer (STUD-04 / STUD-05 / STUD-06).
 *
 * All functions are RSC-callable server-side utilities:
 *   - `await createClient()` (anon key + RLS; PITFALLS Pitfall 3).
 *   - `userId` always comes from validated getClaims() in the calling page/action.
 *   - No revalidatePath here — these are pure reads.
 */

import { createClient } from '@/lib/supabase/server'
import type { BipWithRelations } from '@/lib/types/bip'

/**
 * Batch-fetch saved BIP IDs for a user.
 *
 * Returns a Set<string> for O(1) per-card lookup in BipGrid.
 * Returns an empty Set when `userId` is null (unsigned-in / non-student).
 *
 * Used by: /bips page (batch query so each card knows initialSaved state).
 */
export async function getSavedBipIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from('saved_bips').select('bip_id').eq('user_id', userId)
  return new Set((data ?? []).map((r) => r.bip_id))
}

/**
 * Count saved BIPs for a user — lightweight (HEAD request, no rows returned).
 *
 * Used by: /student-dashboard summary card.
 */
export async function getSavedBipsCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('saved_bips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

/**
 * Check if a single BIP is saved by a user.
 *
 * Used by: /bip/[slug] detail page (per-BIP check).
 */
export async function isBipSaved(userId: string, bipId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('saved_bips')
    .select('id')
    .eq('user_id', userId)
    .eq('bip_id', bipId)
    .maybeSingle()
  return data != null
}

/**
 * Fetch all saved BIPs for a user, ordered most-recently-saved first (D-03).
 *
 * Joins through saved_bips → bips → host_university via PostgREST embedding.
 * Client-side filter: silently excludes non-approved BIPs (D-03a / RESEARCH OQ1).
 * Empty partners array is appended so the shape matches BipWithRelations.
 *
 * Used by: /student-dashboard/saved page.
 */
export async function getSavedBips(userId: string): Promise<BipWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('saved_bips')
    .select(`
      saved_at,
      bips:bip_id (
        id, slug, title, application_deadline, ects_credits, language_of_instruction,
        physical_start_date, physical_end_date, host_city, study_levels,
        green_travel, inclusion_support, is_seed, status, created_at, subject_areas,
        host_university:universities!host_university_id (id, name, country, city, erasmus_code)
      )
    `)
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

  if (error) {
    // Production degrades gracefully to an empty list (logged), avoiding a 500
    // on /student-dashboard/saved (no error boundary on that segment). In
    // development the error is re-thrown so it surfaces loudly during dev.
    if (process.env.NODE_ENV === 'production') {
      console.error('[getSavedBips] query failed, returning empty:', error)
      return []
    }
    throw error
  }

  // Cast shape: PostgREST returns bips as a single embedded object (not array)
  // because the FK is bip_id (one saved row → one BIP).
  // D-03a: silently exclude non-approved BIPs (client-side filter is always safe — RESEARCH OQ1).
  return (data ?? [])
    .map((row) => (row.bips as unknown as (BipWithRelations & { status?: string }) | null))
    .filter(
      (bip): bip is BipWithRelations =>
        bip != null && (bip as { status?: string }).status === 'approved',
    )
    .map((bip) => ({
      ...bip,
      host_university: bip.host_university ?? null,
      partners: [],
    }))
}
