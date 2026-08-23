'use client'

import type { AdminBip } from '@/lib/queries/adminBips'
import type { AdminBipEditItem } from '@/lib/queries/bipEdits'
import type { BipStatus } from '@/lib/utils/status'
import { AdminBipCard } from '@/components/admin/AdminBipCard'
import { BulkActionBar } from '@/components/admin/BulkActionBar'
import { useAdminSelection } from '@/components/admin/AdminSelectionContext'

type QueueItem =
  | { kind: 'submission'; bip: AdminBip; sortKey: string; bulkId: string }
  | { kind: 'edit'; edit: AdminBipEditItem; sortKey: string; bulkId: string }

export function AdminQueueClient({
  submissions,
  edits,
}: {
  submissions: AdminBip[]
  edits: AdminBipEditItem[]
}) {
  const queueItems: QueueItem[] = [
    ...submissions.map((bip): QueueItem => ({ kind: 'submission', bip, sortKey: bip.created_at, bulkId: bip.id })),
    ...edits.map((edit): QueueItem => ({ kind: 'edit', edit, sortKey: edit.created_at, bulkId: edit.bip.id })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey))

  const { selected, selectedIds, toggle, clear } = useAdminSelection()

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col gap-4">
        {queueItems.map((item) => {
          if (item.kind === 'submission') {
            return (
              <AdminBipCard
                key={item.bip.id}
                bip={item.bip}
                selectable
                selected={selected.has(item.bulkId)}
                onToggle={toggle}
              />
            )
          }
          const editBip: AdminBip = {
            ...item.edit.bip,
            status: item.edit.status as BipStatus,
          }
          return (
            <AdminBipCard
              key={item.edit.id}
              bip={editBip}
              kind="edit"
              reviewHref={`/admin/bip-edits/${item.edit.id}/review`}
              selectable
              selected={selected.has(item.bulkId)}
              onToggle={toggle}
            />
          )
        })}
      </div>
      <BulkActionBar selectedIds={selectedIds} onDone={clear} />
    </>
  )
}
