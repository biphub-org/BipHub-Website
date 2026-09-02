import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve the server-authoritative `host_university_id` for a BIP draft
 * write (shared by `saveDraftAction` and `submitBipAction`).
 *
 * Coordinators get their profile-locked university (never client input).
 * Admin accounts are bootstrapped via SQL and skip onboarding, so they
 * commonly have NO profile university — yet the admin "Add new BIP" page
 * (`app/(admin)/admin/bips/new`) renders with a first-alphabetical
 * fallback host. Without the same fallback here, every admin draft save
 * failed with "No host university on your profile" while the builder
 * looked perfectly fine. Mirror the page's fallback so admin drafts save.
 *
 * Returns `null` when no host can be resolved (coordinator without a
 * profile university, or an admin when the universities table is empty) —
 * callers surface their own role-appropriate error in that case.
 */
export async function resolveHostUniversityId(
  supabase: SupabaseClient,
  userId: string,
  role: string | undefined,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('university_id')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.university_id) return profile.university_id

  if (role === 'admin') {
    const { data: fallback } = await supabase
      .from('universities')
      .select('id')
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()
    return fallback?.id ?? null
  }

  return null
}
