/**
 * Admin user-removal guard — pure decision helper shared by the
 * `removeUserAction` Server Action and its unit test.
 *
 * Policy:
 *   - target must exist (defense-in-depth: the action reads the row first)
 *   - caller cannot remove their own account (use the self-service
 *     delete-account flow instead — admins deleting themselves could
 *     strand the site with zero admins)
 *   - only `student` / `coordinator` accounts are removable; `admin`
 *     accounts (and any unknown role) are protected
 */

export type RemovableTarget = {
  id: string
  role: string | null
}

export function canAdminRemoveUser(args: {
  callerId: string
  target: RemovableTarget | null
}): string | null {
  const { callerId, target } = args
  if (!target) return 'User not found.'
  if (target.id === callerId) {
    return 'You cannot remove your own admin account.'
  }
  if (target.role !== 'student' && target.role !== 'coordinator') {
    return 'Only student and coordinator accounts can be removed.'
  }
  return null
}
