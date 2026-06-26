/**
 * Status badge class lookup — Tailwind v4 static scanner safelist.
 *
 * NEVER use template literals like `bg-status-${status}-bg` — Tailwind v4 purges
 * dynamic strings (CLAUDE.md never-do; PITFALLS Pitfall 13).
 *
 * Tokens declared in `app/globals.css` `@theme inline` block (Phase 2 additions:
 * --color-status-{draft,pending,approved,rejected} and matching -bg variants).
 *
 * Consumed by:
 *   - DashboardBipCard (Plan 02-05) — colors the status pill on each card
 *   - Any future admin review UI that surfaces a coordinator BIP's status
 */

export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'

export const STATUS_BADGE_CLASSES: Record<BipStatus, string> = {
  draft:              'bg-status-draft-bg text-status-draft border-status-draft',
  pending:            'bg-status-pending-bg text-status-pending border-status-pending',
  approved:           'bg-status-approved-bg text-status-approved border-status-approved',
  rejected:           'bg-status-rejected-bg text-status-rejected border-status-rejected',
  changes_requested:  'bg-status-changes-requested-bg text-status-changes-requested border-status-changes-requested',
}

export const STATUS_LABELS: Record<BipStatus, string> = {
  draft:             'Draft',
  pending:           'Pending',
  approved:          'Approved',
  rejected:          'Rejected',
  changes_requested: 'Changes Requested',
}
