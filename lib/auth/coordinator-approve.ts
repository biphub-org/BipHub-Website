/**
 * Idempotent coordinator-approve helpers (pure, no Supabase dependency so
 * they are unit-testable).
 *
 * Context: approving a coordinator request calls
 * `admin.auth.admin.inviteUserByEmail`, which creates the auth account, then
 * marks the request `approved` and backfills `profiles`. If the invite
 * succeeds but a later step fails (status update, profile upsert, crash),
 * the admin retries — and the retry's invite fails with "already exists".
 * Before this fix the request was stuck `pending` forever with no recovery
 * path. The retry path now looks up the existing auth user and, when that
 * account is a coordinator (i.e. it is the account the first attempt
 * created), completes the approval instead of erroring.
 *
 * Safety: adoption is gated on `profiles.role === 'coordinator'` (the
 * authoritative, server-controlled role — never client metadata). A
 * student/admin account that happens to share the email is NEVER adopted;
 * the admin keeps the "already exists" error.
 */

export type AdoptableRole = string | null | undefined

/** True when an invite error message means "account already exists". */
export function isInviteAlreadyExistsError(
  message: string | null | undefined,
): boolean {
  if (!message) return false
  const msg = message.toLowerCase()
  return (
    msg.includes('already') ||
    msg.includes('registered') ||
    msg.includes('exists')
  )
}

/**
 * True only when the existing account may be adopted into this approval:
 * it is a coordinator (the first approve attempt created it). Every other
 * role — student, admin, unknown/null — must NOT be adopted.
 */
export function shouldAdoptExistingAccount(
  profileRole: AdoptableRole,
): boolean {
  return profileRole === 'coordinator'
}

type EmailUser = { id: string; email?: string | null }

/** Case-insensitive lookup of a user by email within one listUsers page. */
export function findUserByEmail<T extends EmailUser>(
  users: readonly T[],
  email: string,
): T | null {
  const wanted = email.trim().toLowerCase()
  if (!wanted) return null
  for (const u of users) {
    if (typeof u.email === 'string' && u.email.toLowerCase() === wanted) {
      return u
    }
  }
  return null
}
