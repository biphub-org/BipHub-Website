'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SearchX, Download, X } from 'lucide-react'
import { AdminBipRow } from '@/components/admin/AdminBipRow'
import { AdminExportMenu } from '@/components/admin/AdminExportMenu'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { bulkModerateBips } from '@/lib/actions/admin-bulk'
import type { AdminBip } from '@/lib/queries/adminBips'

interface Props {
  bips: AdminBip[]
}

export function AdminBipsSelectList({ bips }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startBulk] = useTransition()
  const [showRejectNote, setShowRejectNote] = useState(false)
  const [note, setNote] = useState('')

  const allSelected = bips.length > 0 && selected.size === bips.length
  const selectedIds = Array.from(selected)
  const hasSelection = selectedIds.length > 0

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(bips.map((b) => b.id)))
    else setSelected(new Set())
  }

  function clear() {
    setSelected(new Set())
    setShowRejectNote(false)
    setNote('')
  }

  function handleBulkApprove() {
    startBulk(async () => {
      const result = await bulkModerateBips(selectedIds, 'approve', note.trim() || undefined)
      if (result.failed.length === 0) toast.success(`${result.succeeded.length} BIP(s) approved`)
      else if (result.succeeded.length === 0) toast.error(result.failed[0]?.error ?? 'Bulk approve failed')
      else toast.warning(`${result.succeeded.length} approved, ${result.failed.length} failed`)
      clear()
      router.refresh()
    })
  }

  function handleBulkReject() {
    if (!showRejectNote) {
      setShowRejectNote(true)
      return
    }
    if (note.trim().length < 10) {
      toast.error('Reason must be at least 10 characters.')
      return
    }
    startBulk(async () => {
      const result = await bulkModerateBips(selectedIds, 'reject', note.trim())
      if (result.failed.length === 0) toast.success(`${result.succeeded.length} BIP(s) rejected`)
      else if (result.succeeded.length === 0) toast.error(result.failed[0]?.error ?? 'Bulk reject failed')
      else toast.warning(`${result.succeeded.length} rejected, ${result.failed.length} failed`)
      clear()
      router.refresh()
    })
  }

  const selectedHref = hasSelection ? `/admin/export.csv?ids=${selectedIds.join(',')}` : null

  return (
    <>
      {/* Selection + export bar */}
      <div className="border-b border-border bg-white px-6 py-3">
        <div className="mx-auto max-w-[1200px] flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            {bips.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4 accent-eu-blue"
                  aria-label="Select all BIPs"
                />
                <span className="text-sm font-medium text-ink">
                  Select all
                  <span className="ml-1 text-xs font-normal text-muted">({bips.length})</span>
                </span>
              </label>
            )}
            {hasSelection && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-eu-blue-50 border border-eu-blue-light px-3 py-1 text-xs font-semibold text-eu-blue">
                {selectedIds.length} selected
                <button
                  onClick={clear}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-eu-blue/10"
                  aria-label="Clear selection"
                >
                  <X size={12} aria-hidden />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AdminExportMenu selectedIds={selectedIds} filteredCount={bips.length} />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-6">
        {bips.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16">
            <SearchX className="mb-3 text-muted" size={32} aria-hidden />
            <h2 className="text-base font-semibold text-ink">No BIPs match these filters</h2>
            <p className="mt-1 text-sm text-muted">Try clearing the search or switching to a different status.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bips.map((bip) => (
              <AdminBipRow
                key={bip.id}
                bip={bip}
                selectable
                selected={selected.has(bip.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom bulk + export bar when selection active */}
      {hasSelection && (
        <div className="sticky bottom-4 z-20 mx-4 md:mx-auto max-w-[1200px] mt-4 rounded-2xl border border-border bg-white px-4 py-3 shadow-lg flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-ink">
            {selectedIds.length} selected <span className="text-xs text-muted font-normal">· bulk actions + export</span>
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href={selectedHref!}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-medium text-ink hover:bg-bg-soft"
            >
              <Download size={14} aria-hidden />
              Export selected
            </a>

            <div className="h-6 w-px bg-border hidden sm:block" aria-hidden />

            {!showRejectNote ? (
              <>
                <Button variant="ghost" size="sm" onClick={clear} disabled={isPending} className="rounded-full">
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={isPending}
                  className="rounded-full border-status-rejected text-status-rejected hover:bg-status-rejected-bg"
                >
                  Bulk reject
                </Button>
                <Button variant="primary" size="sm" onClick={handleBulkApprove} disabled={isPending} className="rounded-full">
                  {isPending ? 'Working…' : `Approve ${selectedIds.length}`}
                </Button>
              </>
            ) : (
              <>
                <input
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason (≥10 chars)"
                  className="h-9 w-[220px] rounded-full border border-border bg-white px-4 text-sm placeholder:text-muted-2 focus:border-eu-blue focus:outline-none focus:ring-2 focus:ring-eu-blue/20"
                />
                <Button variant="ghost" size="sm" onClick={() => setShowRejectNote(false)} disabled={isPending} className="rounded-full">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={isPending || note.trim().length < 10}
                  className="rounded-full bg-status-rejected border-status-rejected hover:bg-red-700"
                >
                  {isPending ? 'Rejecting…' : `Reject ${selectedIds.length}`}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
