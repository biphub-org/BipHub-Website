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
import { getCountryName } from '@/lib/countries'
import { sendEmail } from '@/lib/email/send'
import type { StudentProfileFieldChange } from '@/lib/email/templates/StudentProfileChangedAdminEmail'

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

  // Snapshot BEFORE the write so the admin notification can show
  // before → after. No prior row means first-time setup (creation, not a
  // change) — nothing to diff, so no email.
  type BeforeProfileRow = {
    full_name: string | null
    country: string | null
    university_id: string | null
    university: { name: string } | Array<{ name: string }> | null
  }
  const { data: beforeRaw } = await supabase
    .from('profiles')
    .select('full_name, country, university_id, university:university_id ( name )')
    .eq('id', data.claims.sub)
    .maybeSingle()
  const before = (beforeRaw ?? null) as unknown as BeforeProfileRow | null

  const writeError = await writeStudentProfile(
    supabase,
    data.claims.sub,
    loginEmail,
    parsed.data,
  )
  if (writeError) {
    return { error: writeError }
  }

  // Admin notification with the before → after diff (fire-and-forget per
  // D-11: the profile already committed, email failures never roll it back).
  // Only actual changes trigger it — saving untouched values stays silent.
  if (before) {
    const beforeUniversity = Array.isArray(before.university)
      ? (before.university[0]?.name ?? null)
      : (before.university?.name ?? null)
    const beforeUniversityId = before.university_id ?? null
    const afterUniversityId = parsed.data.university_id ?? null

    let afterUniversityName: string | null = beforeUniversity
    if (afterUniversityId !== beforeUniversityId) {
      afterUniversityName = null
      if (afterUniversityId) {
        const { data: afterUni } = await supabase
          .from('universities')
          .select('name')
          .eq('id', afterUniversityId)
          .maybeSingle()
        afterUniversityName = (afterUni as { name?: string } | null)?.name ?? null
      }
    }

    const changes: StudentProfileFieldChange[] = []
    if ((before.full_name ?? '') !== parsed.data.full_name) {
      changes.push({
        label: 'Full name',
        before: before.full_name || '—',
        after: parsed.data.full_name,
      })
    }
    if ((before.country ?? '') !== parsed.data.country) {
      changes.push({
        label: 'Country',
        before: before.country ? getCountryName(before.country) : '—',
        after: getCountryName(parsed.data.country),
      })
    }
    if (afterUniversityId !== beforeUniversityId) {
      changes.push({
        label: 'University',
        before: beforeUniversity || '—',
        after: afterUniversityName || '—',
      })
    }

    // Untouched saves record and send nothing.
    if (changes.length > 0) {
      // Durable audit row for the admin dashboard (migration 00060): the
      // email is fire-and-forget, this row is the in-dashboard notification.
      // Non-blocking like the email — an insert failure never rolls back the
      // saved profile.
      try {
        const { error: auditError } = await supabase
          .from('student_profile_changes')
          .insert({
            student_id: data.claims.sub,
            changes,
          })
        if (auditError) {
          console.error(
            '[updateStudentProfile] audit insert failed (non-blocking):',
            auditError.message,
          )
        }
      } catch (err) {
        console.error(
          '[updateStudentProfile] audit insert failed (non-blocking):',
          err,
        )
      }

      const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
      if (adminRecipient) {
        try {
          await sendEmail(adminRecipient, {
            template: 'student-profile-changed-admin',
            props: {
              studentName: parsed.data.full_name,
              studentEmail: loginEmail ?? '',
              changes,
              updatedAt: new Date().toISOString(),
            },
          })
        } catch (err) {
          console.error(
            '[updateStudentProfile] admin notification email failed (non-blocking):',
            err,
          )
        }
      } else {
        console.warn(
          '[updateStudentProfile] ADMIN_NOTIFICATION_EMAIL unset — skipping admin notification email',
        )
      }

      // Confirmation receipt to the student (fire-and-forget per D-11).
      // Only actual changes trigger it — untouched saves stay silent,
      // mirroring the admin-notification contract above.
      if (loginEmail) {
        try {
          await sendEmail(loginEmail, {
            template: 'student-profile-updated',
            props: { fullName: parsed.data.full_name },
          })
        } catch (err) {
          console.error(
            '[updateStudentProfile] student confirmation email failed (non-blocking):',
            err,
          )
        }
      }
    }
  }

  revalidatePath('/student-dashboard')
  revalidatePath('/', 'layout')
  return { success: true }
}
