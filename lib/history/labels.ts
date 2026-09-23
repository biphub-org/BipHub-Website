/**
 * Human labels for history entries (coordinator BIP timeline + admin logs).
 *
 * Single source of truth so the coordinator timeline, the coordinator
 * history page, and the admin history tabs describe the same action_kind /
 * activity action with identical copy. Unknown values fall back to a
 * humanised raw string — never blank.
 */

const BIP_ACTION_LABELS: Record<string, string> = {
  submit: 'Submitted for review',
  approve: 'Approved',
  reject: 'Rejected',
  resubmit: 'Resubmitted for review',
  withdraw: 'Withdrawn to draft',
  admin_edit: 'Edited by BipHub team',
  submit_edit: 'Edit submitted for review',
  resubmit_edit: 'Edit resubmitted for review',
  approve_edit: 'Edit approved',
  reject_edit: 'Edit rejected',
  request_changes: 'Changes requested',
}

const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  account_created: 'Account created',
  account_deleted: 'Account deleted',
  coordinator_request_filed: 'Coordinator access requested',
  coordinator_request_approved: 'Coordinator request approved',
  coordinator_request_rejected: 'Coordinator request rejected',
  profile_change_requested: 'Profile change requested',
  profile_change_approved: 'Profile change approved',
  profile_change_declined: 'Profile change declined',
  student_profile_updated: 'Profile updated',
  alerts_subscribed: 'Subscribed to BIP alerts',
  alerts_updated: 'Updated BIP alert preferences',
  alerts_cleared: 'Cleared BIP alert preferences',
}

const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  coordinator: 'Coordinators',
  student: 'Students',
  admin: 'Admins',
}

function humanise(raw: string): string {
  return raw
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function bipActionLabel(actionKind: string): string {
  return BIP_ACTION_LABELS[actionKind] ?? humanise(actionKind)
}

/** Every bip_status_history action_kind, in lifecycle order — filter options. */
export const BIP_ACTION_KINDS = [
  'submit',
  'approve',
  'reject',
  'resubmit',
  'withdraw',
  'admin_edit',
  'submit_edit',
  'resubmit_edit',
  'approve_edit',
  'reject_edit',
  'request_changes',
]

export function activityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABELS[action] ?? humanise(action)
}

export function activityCategoryLabel(category: string): string {
  return ACTIVITY_CATEGORY_LABELS[category] ?? humanise(category)
}
