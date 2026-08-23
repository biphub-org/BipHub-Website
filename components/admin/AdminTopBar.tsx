'use client'

import { Suspense } from 'react'
import { AdminExportMenu } from '@/components/admin/AdminExportMenu'
import { useAdminSelection } from '@/components/admin/AdminSelectionContext'

function ExportMenuWithSelection() {
  const { selectedIds } = useAdminSelection()
  return <AdminExportMenu selectedIds={selectedIds} />
}

export function AdminTopBar() {
  return (
    <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-end gap-2">
      <Suspense fallback={<div className="h-8 w-24 rounded-full border border-border bg-white" aria-hidden />}>
        <ExportMenuWithSelection />
      </Suspense>
      <a
        href="/admin/bips/new"
        className="inline-flex items-center gap-2 rounded-full bg-eu-gold px-4 py-2 text-sm font-semibold text-ink border border-eu-gold hover:bg-eu-gold-dark hover:-translate-y-px transition-all"
      >
        <span aria-hidden>+</span> Add new BIP
      </a>
    </div>
  )
}
