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
 *   - `revalidatePath('/', 'layout')` after success so the public layout's
 *     cached claims/initials refresh on the next render.
 *   - `redirect('/dashboard')` lives in the action so RHF only handles failures.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { profileSchema, studentProfileSchema } from '@/lib/schemas/profile'

type SaveProfileResult = { error?: string }

export async function saveProfileAction(
  formData: FormData,
): Promise<SaveProfileResult> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get('full_name'),
    contact_email: formData.get('contact_email'),
    university_id: formData.get('university_id'),
    country: formData.get('country'),
    erasmus_code: formData.get('erasmus_code'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (authError || !data?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  // RLS: profiles_insert_own (WITH CHECK id = auth.uid()) +
  // profiles_update_own_or_admin both require id matching the JWT subject.
  // Upsert covers both new (post-signup) and existing (re-edit) rows.
  // NOTE: country is NOT a profiles column — it is derived downstream from
  // `universities.country` via the chosen `university_id`.
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: data.claims.sub, // CRITICAL: must match auth.uid()
        full_name: parsed.data.full_name,
        contact_email: parsed.data.contact_email,
        university_id: parsed.data.university_id,
        erasmus_code: parsed.data.erasmus_code,
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.error('[saveProfileAction] supabase error:', error.message)
    return { error: 'Failed to save your profile. Please try again.' }
  }

  // Bust the (public) layout's getClaims/profile cache so StickyNav initials
  // refresh on the very next render after onboarding completes.
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

/**
 * Student profile completion — /student-dashboard/complete-profile.
 *
 * Same shape as student registration details (studentProfileSchema: full_name +
 * country required, home university optional). Upserts only the student's own
 * row (id = claims.sub, RLS insert_own/update_own) and never touches `role`.
 * contact_email is synced from the login email so admins can reach the student.
 */
export async function saveStudentProfileAction(
  formData: FormData,
): Promise<SaveProfileResult> {
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

  if (parsed.data.university_id) {
    const { data: uni } = await supabase
      .from('universities')
      .select('id')
      .eq('id', parsed.data.university_id)
      .maybeSingle()
    if (!uni) {
      return { error: 'The selected university is no longer available. Please choose another.' }
    }
  }

  const loginEmail = typeof data.claims.email === 'string' ? data.claims.email : null

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: data.claims.sub, // CRITICAL: must match auth.uid()
        full_name: parsed.data.full_name,
        ...(loginEmail ? { contact_email: loginEmail } : {}),
        country: parsed.data.country,
        university_id: parsed.data.university_id ?? null,
      },
      { onConflict: 'id' },
    )

  if (error) {
    console.error('[saveStudentProfileAction] supabase error:', error.message)
    return { error: 'Failed to save your profile. Please try again.' }
  }

  revalidatePath('/', 'layout')
  redirect('/student-dashboard')
}
