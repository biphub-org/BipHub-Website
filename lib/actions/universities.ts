'use server'

/**
 * Universities Server Actions (AUTH-07).
 *
 * Contract:
 *   - `'use server'` is file-level.
 *   - `searchUniversitiesAction` is a public-readable query — RLS
 *     `universities_select_public` allows anon + authenticated.
 *   - `addUniversityAction` calls the SECURITY DEFINER RPC
 *     `insert_university_if_not_exists` introduced by migration 00009. The RPC
 *     bypasses the `universities_insert_admin` RLS at the function boundary
 *     (search_path locked, EXECUTE granted to authenticated only).
 *   - CLAUDE.md never-do compliance: this file MUST NOT import the
 *     service-role admin client factory. The SECURITY DEFINER RPC is the
 *     coordinator-callable path; service-role lives only in `app/(admin)/`.
 */

import { createClient } from '@/lib/supabase/server'
import { addUniversitySchema } from '@/lib/schemas/profile'

export type UniversitySearchResult = {
  id: string
  name: string
  country: string
  erasmus_code: string | null
}

/**
 * Read existing universities for the onboarding combobox.
 *
 * - Empty query returns the alphabetical top 50 so the popover shows a useful
 *   prefill list before the user types anything.
 * - Queries < 2 chars also return the prefill list (avoids one-letter ILIKE
 *   scans across the whole table).
 * - Errors are logged and swallowed; the combobox falls back to "no results".
 */
export async function searchUniversitiesAction(
  query: string,
): Promise<UniversitySearchResult[]> {
  const supabase = await createClient()
  const trimmed = query.trim()
  let q = supabase
    .from('universities')
    .select('id, name, country, erasmus_code')
    .order('name', { ascending: true })
    .limit(50)
  if (trimmed.length >= 2) {
    // Match either the university name OR its Erasmus code (item 13c). Escape
    // PostgREST reserved chars (comma/parenthesis) so codes like "D MUNCHEN02"
    // and free punctuation cannot break out of the .or() filter grammar.
    const safe = trimmed.replace(/[(),]/g, ' ')
    q = q.or(`name.ilike.%${safe}%,erasmus_code.ilike.%${safe}%`)
  }
  const { data, error } = await q
  if (error) {
    console.error('[searchUniversitiesAction] supabase error:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Add a university via the SECURITY DEFINER RPC from migration 00009.
 *
 * Returns `{ id }` on success or `{ error }` on validation/RPC failure. The
 * combobox catches the result and selects the new row inline.
 *
 * IMPORTANT: never call the admin (service-role) client here — the RPC handles RLS bypass
 * server-side and is the documented coordinator-callable contract.
 */
export async function addUniversityAction(
  formData: FormData,
): Promise<{ id: string } | { error: string }> {
  const parsed = addUniversitySchema.safeParse({
    name: formData.get('name'),
    country: formData.get('country'),
    erasmus_code: formData.get('erasmus_code') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const { data, error } = await supabase.rpc('insert_university_if_not_exists', {
    p_name: parsed.data.name,
    p_country: parsed.data.country,
    p_erasmus_code: parsed.data.erasmus_code ?? undefined,
  })
  if (error) {
    console.error('[addUniversityAction] rpc error:', error.message)
    return { error: 'Failed to add university. Please try again.' }
  }
  return { id: data as string }
}
