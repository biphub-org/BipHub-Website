'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { bulkModerateBips } from '@/lib/actions/admin-bulk'

type Props = {
  selectedIds: string[]
  onDone: () => void
}

export function BulkActionBar({ selectedIds, onDone }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [showRejectNote, setShowRejectNote] = useState(false)

  const count = selectedIds.length
  if (count === 0) return null

  function handleApprove() {
    startTransition(async () => {
      const result = await bulkModerateBips(selectedIds, 'approve', note.trim() || undefined)
      if (result.failed.length === 0) {
        toast.success(`${result.succeeded.length} BIP(s) approved`)
      } else if (result.succeeded.length === 0) {
        toast.error(result.failed[0]?.error ?? 'Bulk approve failed')
      } else {
        toast.warning(`${result.succeeded.length} approved, ${result.failed.length} failed`)
      }
      setNote('')
      onDone()
      router.refresh()
    })
  }

  function handleReject() {
    if (!showRejectNote) {
      setShowRejectNote(true)
      return
    }
    if (note.trim().length < 10) {
      toast.error('Reason must be at least 10 characters.')
      return
    }
    startTransition(async () => {
      const result = await bulkModerateBips(selectedIds, 'reject', note.trim())
      if (result.failed.length === 0) {
        toast.success(`${result.succeeded.length} BIP(s) rejected`)
      } else if (result.succeeded.length === 0) {
        toast.error(result.failed[0]?.error ?? 'Bulk reject failed')
      } else {
        toast.warning(`${result.succeeded.length} rejected, ${result.failed.length} failed`)
      }
      setNote('')
      setShowRejectNote(false)
      onDone()
      router.refresh()
    })
  }

  const exportHref = `/admin/export.csv?ids=${selectedIds.join(',')}`

  return (
    <div className="sticky bottom-4 z-20 mx-auto max-w-[1200px] mt-4 rounded-full border border-border bg-white px-4 py-3 shadow-lg flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-ink">
        {count} selected <span className="text-xs text-muted font-normal">· per-row audit + ISR</span>
      </span>

      <div className="ml-auto flex items-center gap-2">
        {!showRejectNote ? (
          <>
            <a
              href={exportHref}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-bg-soft"
            >
              Export selected
            </a>
            <div className="h-6 w-px bg-border hidden sm:block" aria-hidden />
            <Button variant="ghost" size="sm" onClick={() => onDone()} disabled={isPending} className="rounded-full">
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReject} disabled={isPending} className="rounded-full border-status-rejected text-status-rejected hover:bg-status-rejected-bg">
              Bulk reject
            </Button>
            <Button variant="primary" size="sm" onClick={handleApprove} disabled={isPending} className="rounded-full">
              {isPending ? 'Working…' : `Approve ${count}`}
            </Button>
          </>
        ) : (
          <>
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason (≥10 chars) — shown to coordinator"
              className="h-9 w-[260px] rounded-full border border-border bg-white px-4 text-sm placeholder:text-muted-2 focus:border-eu-blue focus:outline-none focus:ring-2 focus:ring-eu-blue/20"
            />
            <Button variant="ghost" size="sm" onClick={() => setShowRejectNote(false)} disabled={isPending} className="rounded-full">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleReject}
              disabled={isPending || note.trim().length < 10}
              className="rounded-full bg-status-rejected border-status-rejected hover:bg-red-700"
            >
              {isPending ? 'Rejecting…' : `Reject ${count}`}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
