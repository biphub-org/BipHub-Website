'use client'

import { useSearchParams } from 'next/navigation'
import { ChevronDown, Download, Users, GraduationCap, BarChart3, Filter, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminExportMenuProps {
  /** IDs currently selected in the list (for the "selected" export) */
  selectedIds?: string[]
  /** Number of rows currently visible / filtered. Used for the label count. */
  filteredCount?: number
  /** When true, the menu shows only BIP exports (no coordinator item). Default: include coordinators. */
  hideCoordinators?: boolean
  /** Optional override for the trigger label */
  label?: string
}

function buildFilteredHref(sp: URLSearchParams): string {
  const qs = sp.toString()
  return qs ? `/admin/export.csv?${qs}` : '/admin/export.csv'
}

function buildSelectedHref(selectedIds: string[]): string {
  if (selectedIds.length === 0) return '#'
  const params = new URLSearchParams()
  params.set('ids', selectedIds.join(','))
  return `/admin/export.csv?${params.toString()}`
}

function buildCoordinatorsHref(sp: URLSearchParams): string {
  // Carry over coordinator-relevant filters: q and country (university country). Preserve only those to avoid mixing BIP-only filters.
  const params = new URLSearchParams()
  params.set('entity', 'coordinators')
  const q = sp.get('q')?.trim()
  if (q) params.set('q', q)
  const country = sp.get('country')?.trim()
  if (country) params.set('country', country)
  // If no extra filters, just entity param; if we added, keep them
  // Also support ids? No — coordinators "selected" is separate via ids param with entity.
  const qs = params.toString()
  return `/admin/export.csv?${qs}`
}

function buildStudentsHref(sp: URLSearchParams): string {
  // Carry over student-relevant filters: q and alerts. Preserve only those to avoid mixing BIP-only filters.
  const params = new URLSearchParams()
  params.set('entity', 'students')
  const q = sp.get('q')?.trim()
  if (q) params.set('q', q)
  const alerts = sp.get('alerts')?.trim().toLowerCase()
  if (alerts === 'on' || alerts === 'off') params.set('alerts', alerts)
  return `/admin/export.csv?${params.toString()}`
}

function buildSelectedCoordinatorsHref(selectedIds: string[]): string | null {
  if (selectedIds.length === 0) return null
  // For now selectedIds in BIP context are BIP ids, not coordinator ids, so we don't offer selected coordinators from BIP selection.
  // This helper is for future coordinator-list pages where selection is coordinator ids.
  const params = new URLSearchParams()
  params.set('entity', 'coordinators')
  params.set('ids', selectedIds.join(','))
  return `/admin/export.csv?${params.toString()}`
}

export function AdminExportMenu({
  selectedIds = [],
  filteredCount,
  hideCoordinators = false,
  label = 'Export',
}: AdminExportMenuProps) {
  const searchParams = useSearchParams()
  const hasFilters = searchParams.toString().length > 0
  const selectedCount = selectedIds.length

  const filteredHref = buildFilteredHref(searchParams)
  const selectedHref = buildSelectedHref(selectedIds)
  const coordinatorsHref = buildCoordinatorsHref(searchParams)
  const studentsHref = buildStudentsHref(searchParams)
  const analyticsHref = '/admin/export.csv?entity=analytics'
  const filteredLabel = hasFilters
    ? `Export filtered${filteredCount != null ? ` (${filteredCount})` : ''}`
    : `Export all${filteredCount != null ? ` (${filteredCount})` : ''}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="rounded-full gap-1.5 bg-white border-border font-semibold">
            <Download size={14} aria-hidden />
            {label}
            <ChevronDown size={14} className="opacity-60" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Export options</div>

          {/* 1. Filtered BIPs */}
          <DropdownMenuItem
            render={<a href={filteredHref} download />}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Filter size={14} className="text-eu-blue" aria-hidden />
            <span className="flex-1 text-sm">{filteredLabel}</span>
          </DropdownMenuItem>

          {/* 2. Selected BIPs */}
          <DropdownMenuItem
            disabled={selectedCount === 0}
            render={selectedCount === 0 ? <span /> : <a href={selectedHref} download />}
            className="flex items-center gap-2 cursor-pointer data-[disabled]:opacity-40"
          >
            <CheckSquare size={14} className={selectedCount === 0 ? 'text-muted' : 'text-eu-blue'} aria-hidden />
            <span className="flex-1 text-sm">
              Export selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </span>
          </DropdownMenuItem>

        {!hideCoordinators && (
          <>
            <DropdownMenuSeparator />
            <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Coordinators</div>
              <DropdownMenuItem
                render={<a href={coordinatorsHref} download />}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Users size={14} className="text-eu-blue" aria-hidden />
                <span className="flex-1 text-sm">Export coordinators</span>
              </DropdownMenuItem>
              {selectedCount > 0 && buildSelectedCoordinatorsHref(selectedIds) ? (
                <DropdownMenuItem
                  disabled
                  className="flex items-center gap-2 opacity-40"
                  title="Select coordinators from the coordinators list to use this option"
                >
                  <Users size={14} className="text-muted" aria-hidden />
                  <span className="flex-1 text-sm text-muted">Export selected coordinators</span>
                </DropdownMenuItem>
              ) : null}
          </>
        )}

        <DropdownMenuSeparator />
        <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Students</div>
          <DropdownMenuItem
            render={<a href={studentsHref} download />}
            className="flex items-center gap-2 cursor-pointer"
          >
            <GraduationCap size={14} className="text-eu-blue" aria-hidden />
            <span className="flex-1 text-sm">Export students</span>
          </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="px-1.5 py-1 text-[11px] uppercase tracking-wide text-muted font-medium">Analytics</div>
          <DropdownMenuItem
            render={<a href={analyticsHref} download />}
            className="flex items-center gap-2 cursor-pointer"
          >
            <BarChart3 size={14} className="text-eu-blue" aria-hidden />
            <span className="flex-1 text-sm">Export analytics snapshot</span>
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
