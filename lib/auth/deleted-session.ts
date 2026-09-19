/**
 * Orphaned-session detection (deleted-account kick).
 *
 * JWTs are stateless: deleting an auth user (e.g. manually in the Supabase
 * dashboard) does NOT invalidate outstanding access tokens — getClaims()
 * keeps passing signature validation until expiry. The only way to notice
 * the account is gone is to ask the Auth server (getUser) and confirm the
 * user row still exists.
 *
 * isOrphanedSession() decides from a getUser() result. It kicks ONLY on a
 * positive gone-signal (GoTrue's "does not exist" message or a 401/404 with
 * no user) and fails OPEN on anything else (network errors, 5xx): a
 * transient Auth outage must degrade to "let them through" rather than log
 * out every signed-in user.
 */

type MaybeUser = { id: string } | null | undefined

type MaybeAuthError = {
  message?: string | null
  status?: number | null
  /** GoTrue machine code, e.g. "user_not_found" for a deleted account. */
  code?: string | null
} | null | undefined

const GONE_MESSAGE = /user.*does not exist/i

export function isOrphanedSession(
  user: MaybeUser,
  error: MaybeAuthError,
): boolean {
  // A returned user row is authoritative — the account exists.
  if (user) return false
  if (!error) return false
  if (error.code === 'user_not_found') return true
  if (error.message && GONE_MESSAGE.test(error.message)) return true
  return error.status === 401 || error.status === 403 || error.status === 404
}
