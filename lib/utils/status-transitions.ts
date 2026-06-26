/**
 * BIP state machine validator (per D-06 from 03-CONTEXT.md).
 *
 * Application-layer enforcement of allowed (from, to, actor) transitions.
 * The DB has a CHECK constraint on `status` enum values but no transition
 * constraint — this module is the authoritative source for "which moves
 * are legal."
 *
 * Security: T-03-03 mitigation — coordinators cannot exploit a direct
 * `rejected → pending` move; their only path back to `pending` is via
 * `submitBipAction`, which calls validateTransition('draft', 'pending',
 * 'coordinator') after the RLS-enforced `bips_update_own_editable` policy
 * has forced status='draft' on save.
 */

import type { BipStatus } from './status'

export type Actor = 'coordinator' | 'admin'

export const ALLOWED_TRANSITIONS: ReadonlyArray<{
  from: BipStatus | null
  to: BipStatus
  actor: Actor
}> = [
  { from: null,       to: 'draft',    actor: 'coordinator' }, // create
  { from: 'draft',    to: 'pending',  actor: 'coordinator' }, // submit / resubmit
  { from: 'pending',  to: 'approved', actor: 'admin' },       // approve
  { from: 'pending',  to: 'rejected', actor: 'admin' },       // reject
  { from: 'rejected', to: 'draft',              actor: 'coordinator' }, // edit-after-reject
  { from: 'approved', to: 'rejected',           actor: 'admin' },       // un-approve
  { from: 'pending',  to: 'draft',              actor: 'coordinator' }, // withdraw (Phase 2 D-10)
  // Phase 8 (D-06a): changes_requested loop for new-submission review
  { from: 'pending',           to: 'changes_requested', actor: 'admin' },       // request changes on new submission
  { from: 'changes_requested', to: 'pending',           actor: 'coordinator' }, // coordinator resubmit after changes
  { from: 'changes_requested', to: 'approved',          actor: 'admin' },       // admin approves after changes
  { from: 'changes_requested', to: 'rejected',          actor: 'admin' },       // admin rejects after changes
] as const

export function validateTransition(
  from: BipStatus | null,
  to: BipStatus,
  actor: Actor,
): void {
  const valid = ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.actor === actor,
  )
  if (!valid) {
    throw new Error(
      `Invalid status transition: ${String(from)} → ${to} by ${actor}`,
    )
  }
}
