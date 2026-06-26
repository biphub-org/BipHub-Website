import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBipEditById } from '@/lib/queries/bipEdits'
import { getAdminBipById } from '@/lib/queries/adminBips'
import { createClient } from '@/lib/supabase/server'
import { BipEditDiffView } from '@/components/admin/BipEditDiffView'
import { BipHeader } from '@/components/bip/BipHeader'
import { BipBody } from '@/components/bip/BipBody'
import { BipSidebar } from '@/components/bip/BipSidebar'
import { AdminActionsPanel } from '@/components/admin/AdminActionsPanel'
import type { BipStatus } from '@/lib/utils/status'

/**
 * Admin BIP-edit review page (Plan 08-08 / EDIT-03/04/05/06).
 *
 * Two-column layout identical to /admin/bips/[id]/review, extended with:
 *   - BipEditDiffView (above BipBody): all-fields side-by-side diff, gold highlight on changes.
 *   - AdminActionsPanel in edit mode (isEdit=true, editId=editRow.id):
 *     "Approve Edit", "Request Changes", "Reject Edit" verdict buttons.
 *
 * Data flow:
 *   1. getBipEditById(editId) — returns null if not found or caller is not admin.
 *      T-08-23: IDOR guard — getBipEditById re-checks role==='admin' server-side.
 *   2. getAdminBipById(editRow.bip_id) — the live BIP for the diff's left column.
 *   3. getCoordinatorForBip(editRow.bip_id) — coordinator name for the action panel.
 *
 * Auth layers:
 *   - middleware.ts blocks unauthenticated /admin/** access
 *   - app/(admin)/layout.tsx re-checks role===admin
 *   - getBipEditById() re-checks role===admin (defense in depth, T-08-23)
 *
 * Cache: force-dynamic — admin verdict state must always be fresh; never cache
 *   this page or the wrong verdict buttons could render for a closed edit.
 */
export const dynamic = 'force-dynamic'

type CoordinatorRow = { full_name: string | null; contact_email: string | null }

async function getCoordinatorForBip(bipId: string): Promise<CoordinatorRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bips')
    .select('profiles!created_by ( full_name, contact_email )')
    .eq('id', bipId)
    .maybeSingle()
  if (error || !data) return null
  const profilesRaw = (data as { profiles?: unknown }).profiles
  const profiles = Array.isArray(profilesRaw)
    ? (profilesRaw[0] as CoordinatorRow | undefined)
    : (profilesRaw as CoordinatorRow | undefined)
  return profiles ?? null
}

export default async function ReviewBipEditPage(props: {
  params: Promise<{ editId: string }>
}) {
  const { editId } = await props.params

  // Step 1: Fetch the bip_edits row (T-08-23: role check inside getBipEditById)
  const editRow = await getBipEditById(editId)
  if (!editRow) notFound()

  // Step 2: Fetch the live BIP + coordinator in parallel
  const [bip, coordinator] = await Promise.all([
    getAdminBipById(editRow.bip_id),
    getCoordinatorForBip(editRow.bip_id),
  ])
  if (!bip) notFound()

  const coordinatorName = coordinator?.full_name ?? ''

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      {/* Breadcrumb row */}
      <div className="bg-white border border-border rounded-md px-4 py-3 mb-4 flex items-center justify-between">
        <Link href="/admin" className="text-sm text-eu-blue hover:underline">
          ← Back to queue
        </Link>
        <span className="text-sm text-muted">
          Edit review — status:{' '}
          <strong>{editRow.status}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-8">
        <div>
          {/* Phase 8: BipEditDiffView renders above BipHeader/BipBody (EDIT-03) */}
          <BipEditDiffView liveBip={bip} proposedEdit={editRow} />
          <BipHeader bip={bip} />
          <BipBody bip={bip} />
        </div>
        <div className="flex flex-col gap-4">
          <BipSidebar bip={bip} mode="admin-review" />
          {/* Edit-mode panel: Approve Edit / Request Changes / Reject Edit */}
          <AdminActionsPanel
            bipId={bip.id}
            bipTitle={bip.title}
            coordinatorName={coordinatorName}
            currentStatus={editRow.status as BipStatus}
            nextPendingId={null}
            isEdit={true}
            editId={editRow.id}
          />
        </div>
      </div>
    </div>
  )
}
