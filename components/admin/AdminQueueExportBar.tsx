'use client'

import { Download, Users, Filter, Clock, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  count: number
}

export function AdminQueueExportBar({ count }: Props) {
  const pendingHref = '/admin/export.csv?status=pending'
  const allHref = '/admin/export.csv'
  const coordinatorsHref = '/admin/export.csv?entity=coordinators'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 bg-white border-border font-semibold">
            <Download size={14} aria-hidden />
            Export
            <ChevronDown size={14} className="opacity-60" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Queue export</div>
        <DropdownMenuItem render={<a href={pendingHref} download />} className="flex items-center gap-2 cursor-pointer">
          <Clock size={14} className="text-eu-blue" aria-hidden />
          <span className="flex-1 text-sm">Export pending ({count ? `${count} queued` : 'pending'})</span>
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={allHref} download />} className="flex items-center gap-2 cursor-pointer">
          <Filter size={14} className="text-eu-blue" aria-hidden />
          <span className="flex-1 text-sm">Export all BIPs</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Coordinators</div>
        <DropdownMenuItem render={<a href={coordinatorsHref} download />} className="flex items-center gap-2 cursor-pointer">
          <Users size={14} className="text-eu-blue" aria-hidden />
          <span className="flex-1 text-sm">Export coordinators</span>
        </DropdownMenuItem>
        <div className="px-2 py-1.5 text-[11px] leading-snug text-muted">
          Use the checkboxes on the queue to export only selected BIPs — the “Export selected” action appears in the bottom bar when items are selected.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
