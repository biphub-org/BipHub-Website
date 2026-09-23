'use server'

/**
 * Admin user-removal Server Action.
 *
 * Lets an admin remove a student or coordinator account. Removal reuses the
 * self-deletion data semantics via the SECURITY DEFINER `admin_delete_user`
 * RPC (00057): approved BIPs are anonymized (directory content survives,
 * PII removed), non-public BIPs are hard-deleted, and the auth.users row is
 * deleted (cascades clear profiles, saved BIPs, subscriptions, alert prefs).
 *
 * Contract (mirrors lib/actions/admin-bips.ts):
 *   - `getClaims()` JWT validation ONLY (CLAUDE.md never-do — never getSession).
 *   - `createClient` (anon-key + admin JWT) — the RPC's DEFINER privilege is
 *     the controlled escalation; no `createAdminClient` (eslint boundary).
 *   - Zod-validate input, read the target row first (defense-in-depth), run
 *     the pure `canAdminRemoveUser` guard, then fire the RPC.
 *   - Returns `{ error }` / `{ success: true }` — the caller redirects.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { canAdminRemoveUser } from '@/lib/auth/admin-remove-user'
import { sendEmail } from '@/lib/email/send'

const RemoveUserSchema = z.object({
  userId: z.string().uuid('Invalid user.'),
})

export type RemoveUserResult = { error?: string; success?: true }

export async function removeUserAction(userId: string): Promise<RemoveUserResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate (server-side re-validation)
  const parsed = RemoveUserSchema.safeParse({ userId })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read the target row (defense-in-depth — the RPC re-checks, but the
  //    guard error messages are friendlier than raw Postgres exceptions).
  //    contact_email + full_name are also read here so the removal notice
  //    can be addressed — the RPC deletes the row, so this is the last
  //    chance to resolve the recipient.
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role, contact_email, full_name')
    .eq('id', parsed.data.userId)
    .maybeSingle()

  // 4. Pure policy guard: exists, not self, student/coordinator only
  const guardError = canAdminRemoveUser({
    callerId: claims.sub,
    target: target ? { id: target.id, role: target.role } : null,
  })
  if (guardError) return { error: guardError }

  // 5. Fire the atomic RPC (anonymize approved → delete non-public BIPs →
  //    delete auth.users row). The function enforces the admin claim again
  //    from the JWT, so a forged request cannot escalate.
  const { error: rpcError } = await supabase.rpc('admin_delete_user', {
    target_user_id: parsed.data.userId,
  })
  if (rpcError) {
    console.error('[removeUserAction] rpc error:', rpcError.message)
    return { error: 'Failed to remove the user. Please try again.' }
  }

  // 5b. Removal notice to the deleted address (fire-and-forget per D-11:
  // the account is already gone, email failure changes nothing). Skipped
  // when the profile carried no contact email.
  const removedEmail = (target as { contact_email?: string | null } | null)?.contact_email ?? null
  if (removedEmail) {
    try {
      await sendEmail(removedEmail, {
        template: 'account-deleted',
        props: {
          initiatedBy: 'admin',
          fullName: (target as { full_name?: string | null } | null)?.full_name ?? '',
        },
      })
    } catch (err) {
      console.error('[removeUserAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn('[removeUserAction] removed user has no contact_email; skipping email.')
  }

  // 6. Bust the admin directory caches
  revalidatePath('/admin/students')
  revalidatePath('/admin/coordinators')
  return { success: true }
}
