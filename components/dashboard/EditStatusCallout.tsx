'use client'

/**
 * Coordinator-facing status banner for the edit path (Phase 8 EDIT-01).
 *
 * Three mutually exclusive states matching UI-SPEC Surface 1:
 *
 *   'approved'          — State A: BIP is live, no open edit.
 *                         Blue border callout with CheckCircle2 icon.
 *   'pending'           — State B: open edit is under review.
 *                         Amber border callout with Clock icon.
 *   'changes_requested' — State C: admin returned the edit or new submission.
 *                         Gold left-border callout (mirrors DashboardBipCard
 *                         rejected-reason callout visual language).
 *
 * Security: adminNote is rendered as text content only — NOT via dangerouslySetInnerHTML.
 * Mitigation for T-08-21 (admin note HTML injection).
 */

import { CheckCircle2, Clock } from 'lucide-react'

interface Props {
  status: 'approved' | 'pending' | 'changes_requested'
  adminNote?: string | null
}

export function EditStatusCallout({ status, adminNote }: Props) {
  if (status === 'approved') {
    return (
      <div className="rounded-md border border-eu-blue-100 bg-eu-blue-50 px-4 py-3 mb-6 flex items-start gap-2">
        <CheckCircle2
          size={16}
          className="text-status-approved mt-0.5 flex-shrink-0"
          aria-hidden
        />
        <p className="text-sm text-ink">
          This BIP is live. Submit an edit to propose changes — the public page
          stays unchanged until an admin approves.
        </p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="rounded-md border border-status-pending bg-status-pending-bg px-4 py-3 mb-6 flex items-start gap-2">
        <Clock
          size={16}
          className="text-status-pending mt-0.5 flex-shrink-0"
          aria-hidden
        />
        <p className="text-sm text-ink">
          Your edit is under review. You can update fields below, but
          resubmission isn&apos;t available until the admin responds.
        </p>
      </div>
    )
  }

  // changes_requested — gold left-border callout matching the rejected-reason
  // callout in DashboardBipCard (lines 79-100 analog).
  return (
    <div className="rounded-r border-l-4 border-eu-gold bg-eu-gold/5 px-4 py-3 mb-6">
      <p className="text-sm font-semibold text-ink mb-1">Changes requested</p>
      {adminNote && (
        <p className="text-sm text-ink-2 mb-2">{adminNote}</p>
      )}
      <p className="text-xs text-muted">
        Update your submission below, then resubmit for review.
      </p>
    </div>
  )
}
