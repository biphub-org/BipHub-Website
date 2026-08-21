'use client'

import { useState } from 'react'
import type { AdminBip } from '@/lib/queries/adminBips'
import type { AdminBipEditItem } from '@/lib/queries/bipEdits'
import type { BipStatus } from '@/lib/utils/status'
import { AdminBipCard } from '@/components/admin/AdminBipCard'
import { AdminExportMenu } from '@/components/admin/AdminExportMenu'
import { BulkActionBar } from '@/components/admin/BulkActionBar'

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

  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
  }

  const selectedIds = Array.from(selected)
  const count = queueItems.length

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-6 pt-4 flex justify-end">
        <AdminExportMenu selectedIds={selectedIds} filteredCount={count} />
      </div>
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
