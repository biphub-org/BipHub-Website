'use server'

/**
 * Profile Server Actions (AUTH-07).
 *
 * Contract:
 *   - `'use server'` is file-level. Every export is a Server Action.
 *   - JWT validation uses `getClaims()` ONLY — never the unvalidated session
 *     reader (CLAUDE.md never-do; PITFALLS Pitfall 1).
 *   - `await createClient()` on every call (factory awaits `cookies()` internally).
 *   - Upsert with `id = claims.sub` so the RLS `profiles_insert_own`
 *     (WITH CHECK id = auth.uid()) and `profiles_update_own_or_admin` policies
 *     accept the write.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  studentProfileSchema,
  type StudentProfileValues,
} from '@/lib/schemas/profile'

type UpdateStudentProfileResult = { error?: string; success?: true }

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Shared student-profile writer: university-existence check + upsert of the
 * caller's own row (id = userId, RLS insert_own/update_own). Never touches
 * `role`. Returns an error string, or null on success.
 */
async function writeStudentProfile(
  supabase: SupabaseServerClient,
  userId: string,
  loginEmail: string | null,
  values: StudentProfileValues,
): Promise<string | null> {
  if (values.university_id) {
    const { data: uni } = await supabase
      .from('universities')
      .select('id')
      .eq('id', values.university_id)
      .maybeSingle()
    if (!uni) {
      return 'The selected university is no longer available. Please choose another.'
    }
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId, // CRITICAL: must match auth.uid()
      full_name: values.full_name,
      ...(loginEmail ? { contact_email: loginEmail } : {}),
      country: values.country,
      university_id: values.university_id ?? null,
    },
    { onConflict: 'id' },
  )

  if (error) {
    console.error('[writeStudentProfile] supabase error:', error.message)
    return 'Failed to save your profile. Please try again.'
  }
  return null
}

/**
 * Student profile edit — /student-dashboard Profile card.
 *
 * Same validation + write path as student registration details, but returns
 * { success: true } instead of redirecting so the dashboard form confirms
 * inline and stays on the page.
 */
export async function updateStudentProfileAction(
  formData: FormData,
): Promise<UpdateStudentProfileResult> {
  const parsed = studentProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    country: formData.get('country'),
    university_id: formData.get('university_id'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (authError || !data?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const loginEmail = typeof data.claims.email === 'string' ? data.claims.email : null

  const writeError = await writeStudentProfile(
    supabase,
    data.claims.sub,
    loginEmail,
    parsed.data,
  )
  if (writeError) {
    return { error: writeError }
  }

  revalidatePath('/student-dashboard')
  revalidatePath('/', 'layout')
  return { success: true }
}
