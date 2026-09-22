/**
 * Student profile-change audit queries (migration 00060).
 *
 * Student edits apply immediately (no approve flow), so this audit table is
 * the admin's in-dashboard notification channel:
 *   - getRecentStudentProfileChanges: latest UNREAD rows with student
 *     identity for the "Recent profile changes" section on /admin/students.
 *   - getRecentStudentProfileChangeCount: unread count for the gold pill on
 *     the Students sidebar entry (0 hides the pill). Marking a row read
 *     (migration 00061) removes it from both.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md — never getSession).
 * RLS: sp_changes_select_admin scopes every read.
 */

import { createClient } from '@/lib/supabase/server'

export type StudentProfileFieldChange = {
  label: string
  before: string
  after: string
}

export type StudentProfileChange = {
  id: string
  studentId: string
  studentName: string | null
  studentEmail: string | null
  changes: StudentProfileFieldChange[]
  createdAt: string
}

async function requireAdmin(): Promise<ReturnType<typeof createClient> | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null
  return supabase
}

function toFieldChanges(raw: unknown): StudentProfileFieldChange[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (c): c is StudentProfileFieldChange =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as { label?: unknown }).label === 'string' &&
        typeof (c as { before?: unknown }).before === 'string' &&
        typeof (c as { after?: unknown }).after === 'string',
    )
    .map((c) => ({ label: c.label, before: c.before, after: c.after }))
}

export async function getRecentStudentProfileChanges(
  limit = 20,
): Promise<StudentProfileChange[]> {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('student_profile_changes')
    .select('id, student_id, changes, created_at')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentStudentProfileChanges] supabase error:', error.message)
    return []
  }

  type Row = {
    id: string
    student_id: string
    changes: unknown
    created_at: string
  }
  const rows = ((data ?? []) as unknown as Row[])

  // Student identity comes from a second query (JS-side join) so the inbox
  // never depends on an FK hint name.
  const identityMap = new Map<string, { full_name: string | null; contact_email: string | null }>()
  const ids = [...new Set(rows.map((r) => r.student_id))]
  if (ids.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, contact_email')
      .in('id', ids)
    if (profileError) {
      console.error(
        '[getRecentStudentProfileChanges] profile fetch error:',
        profileError.message,
      )
    } else {
      for (const p of (profiles ?? []) as unknown as Array<{
        id: string
        full_name: string | null
        contact_email: string | null
      }>) {
        identityMap.set(p.id, {
          full_name: p.full_name,
          contact_email: p.contact_email,
        })
      }
    }
  }

  return rows.map((r) => {
    const identity = identityMap.get(r.student_id) ?? null
    return {
      id: r.id,
      studentId: r.student_id,
      studentName: identity?.full_name ?? null,
      studentEmail: identity?.contact_email ?? null,
      changes: toFieldChanges(r.changes),
      createdAt: r.created_at,
    }
  })
}

export async function getRecentStudentProfileChangeCount(): Promise<number> {
  const supabase = await requireAdmin()
  if (!supabase) return 0

  const { count, error } = await supabase
    .from('student_profile_changes')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    console.error(
      '[getRecentStudentProfileChangeCount] supabase error:',
      error.message,
    )
    return 0
  }
  return count ?? 0
}
