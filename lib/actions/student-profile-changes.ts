'use server'

/**
 * Student profile-change read receipts (admin only, migration 00061).
 *
 *   - markStudentProfileChangeReadAction(changeId) — sets read_at, removing
 *     the row from the /admin/students "Recent profile changes" section and
 *     the Students sidebar pill. The row stays as history. Idempotent:
 *     marking an already-read (or missing) row succeeds silently.
 *
 * Auth: getClaims() + role=admin re-check (the (admin) layout already
 * guards; defence-in-depth per Phase 2 pattern).
 * Client: anon-key createClient — the admin JWT satisfies
 * sp_changes_update_admin, so no service-role import is needed (CLAUDE.md
 * never-do / eslint-enforced).
 */

import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type MarkReadResult = { error?: string; success?: true }

export async function markStudentProfileChangeReadAction(
  changeId: string,
): Promise<MarkReadResult> {
  if (!z.string().uuid().safeParse(changeId).success) {
    return { error: 'Missing notification.' }
  }

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (authError || !data?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata
    ?.role
  if (role !== 'admin') {
    return { error: 'Not allowed.' }
  }

  // RLS sp_changes_update_admin scopes this to admins; WITH CHECK keeps
  // student_id pinned, so marking read can never reassign a row.
  const { error } = await supabase
    .from('student_profile_changes')
    .update({ read_at: new Date().toISOString() })
    .eq('id', changeId)
    .is('read_at', null)
  if (error) {
    console.error('[markStudentProfileChangeRead] supabase error:', error.message)
    return { error: 'Failed to dismiss the notification. Please try again.' }
  }

  revalidatePath('/admin/students')
  return { success: true }
}
