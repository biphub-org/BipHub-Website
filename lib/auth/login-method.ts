/**
 * Unified-login method mapping (pure, no Supabase dependency so it is
 * unit-testable).
 *
 * The `resolve_login_method` RPC returns an account role when one exists,
 * otherwise the latest coordinator-request status for the email (migration
 * 00054), otherwise NULL. This maps that raw string to the login step:
 *   - account roles                    → 'password'
 *   - 'pending'  (request under review) → 'pending'
 *   - 'rejected' (request not approved) → 'rejected'
 *   - 'approved' (invite sent, no sign-in yet) → 'approved'
 *   - anything else / NULL             → 'unknown'
 */

export type LoginMethod = 'password' | 'pending' | 'rejected' | 'approved' | 'unknown'

export function mapLoginMethod(rpcResult: string | null | undefined): LoginMethod {
  if (rpcResult === 'student' || rpcResult === 'coordinator' || rpcResult === 'admin') {
    return 'password'
  }
  if (rpcResult === 'pending') return 'pending'
  if (rpcResult === 'rejected') return 'rejected'
  if (rpcResult === 'approved') return 'approved'
  return 'unknown'
}
