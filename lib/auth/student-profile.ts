import type { createClient } from '@/lib/supabase/server'

/**
 * Student profile backfill from signup-time user_metadata.
 *
 * Registration collects the personal details, but the profiles row can only
 * be written once a session exists. The /auth/callback materialization covers
 * the custom token-hash email template — but with the default Supabase
 * "Confirm signup" template, GoTrue consumes the token itself and bounces to
 * `emailRedirectTo` with no token, so the callback has no session and the row
 * stays bare. The sign-in backfill below closes that gap: whichever link
 * format confirmed the address, the first sign-in completes the row and the
 * student never sees /complete-profile for data we already hold.
 *
 * Never touches `role` (owned by handle_new_user). Best-effort: failures are
 * logged and the (student) layout's profile gate collects anything missing
 * via /complete-profile — which remains the fallback for legacy and
 * admin-created accounts whose user_metadata holds no details.
 */

export type StudentMetadataDetails = {
  fullName: string
  country: string
  universityId: string | null
}

/** Pure field mapping — unit-tested; the writers below depend on it. */
export function parseStudentProfileMetadata(
  metadata: Record<string, unknown>,
): StudentMetadataDetails | null {
  const fullName =
    typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
  const country =
    typeof metadata.country === 'string' && metadata.country
      ? metadata.country
      : null
  if (!fullName || !country) return null
  const universityId =
    typeof metadata.university_id === 'string' && metadata.university_id
      ? metadata.university_id
      : null
  return { fullName, country, universityId }
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

/**
 * Machine-readable backfill outcome for server logs (Vercel). Lets an
 * incomplete-profile report be traced to its branch in one log search:
 * `filled` (row completed), `skipped-no-details` (user_metadata holds
 * nothing — legacy/admin/OTP-created account, /complete-profile is then
 * correct), `failed` (RLS/DB error, see the accompanying error log).
 */
export type BackfillStatus = 'filled' | 'skipped-no-details' | 'failed'

export async function backfillStudentProfileFromMetadata(
  supabase: ServerSupabase,
  userId: string,
  loginEmail: string | null,
  metadata: Record<string, unknown>,
): Promise<BackfillStatus> {
  const details = parseStudentProfileMetadata(metadata)
  if (!details) return 'skipped-no-details'

  let universityId = details.universityId
  if (universityId) {
    const { data: uni } = await supabase
      .from('universities')
      .select('id')
      .eq('id', universityId)
      .maybeSingle()
    if (!uni) universityId = null
  }

  // Runs as the user (RLS insert_own/update_own on id = auth.uid()).
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: details.fullName,
      ...(loginEmail ? { contact_email: loginEmail } : {}),
      country: details.country,
      university_id: universityId,
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.error('[student-profile] backfill failed:', error.message)
    return 'failed'
  }
  return 'filled'
}
