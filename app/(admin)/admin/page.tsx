import { Inbox } from 'lucide-react'
import {
  getAdminPendingSubmissions,
  getAdminPendingEdits,
} from '@/lib/queries/bipEdits'
import { AdminQueueClient } from '@/components/admin/AdminQueueClient'

/**
 * Admin pending queue (/admin) — unified view of new submissions + bip_edits
 * (D-08 / EDIT-03 / Phase 8 plan 06).
 *
 * RSC. Merges getAdminPendingSubmissions() (bips in pending/changes_requested)
 * and getAdminPendingEdits() (bip_edits in pending/changes_requested), sorts
 * the unified list by created_at ascending (FIFO), and renders each item as
 * an AdminBipCard. Edit items carry the "Edit" badge and link to the edit
 * review route (/admin/bip-edits/[editId]/review) — T-08-19 IDOR guard is
 * in the review route itself via getBipEditById role check (08-08).
 *
 * Sub-line copy follows UI-SPEC Surface 2:
 *   0 items  → "You're all caught up. New submissions and edits will appear here automatically."
 *   N items, no edits → "N BIP(s) awaiting review"
 *   N items, ≥1 edit  → "N items awaiting review · includes new submissions and edits"
 *
 * No `dynamic = 'force-dynamic'` needed — the layout's getClaims() call already
 * marks the segment dynamic.
 *
 * Chrome: Export + Add new BIP are now in the global AdminTopBar (layout) — single instance across all /admin subpages.
 */

export default async function AdminQueuePage() {
  const [submissions, edits] = await Promise.all([
    getAdminPendingSubmissions(),
    getAdminPendingEdits(),
  ])

  const count = submissions.length + edits.length
  const hasEdits = edits.length > 0

  return (
    <div>
      <div className="bg-white border-b border-border px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">Pending review</h1>
        <p className="text-sm text-muted">
          {count === 0
            ? "You're all caught up. New submissions and edits will appear here automatically."
            : hasEdits
              ? `${count} items awaiting review · includes new submissions and edits`
              : `${count} BIP${count === 1 ? '' : 's'} awaiting review`}
        </p>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-8">
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-bg-soft mb-6">
            <Inbox className="w-12 h-12 text-muted" aria-hidden />
          </div>
          <h2 className="text-[22px] font-semibold text-ink">No pending items</h2>
          <p className="mt-2 text-sm text-muted max-w-md text-center">
            You&apos;re all caught up. New submissions and edits will appear here automatically.
          </p>
        </div>
      ) : (
        <AdminQueueClient submissions={submissions} edits={edits} />
      )}
    </div>
  )
}
