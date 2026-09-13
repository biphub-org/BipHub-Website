'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { AdminExportMenu } from '@/components/admin/AdminExportMenu'
import { useAdminSelection } from '@/components/admin/AdminSelectionContext'
import { Button } from '@/components/ui/button'

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
      <Button variant="gold" size="sm" asChild className="gap-2">
        <Link href="/admin/bips/new">
          <span aria-hidden>+</span> Add new BIP
        </Link>
      </Button>
    </div>
  )
}
