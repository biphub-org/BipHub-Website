'use client'

/**
 * AdminBipRow — denser admin all-listings row (D-19 / 03-UI-SPEC.md
 * All-Listings Contract). One row per BIP with:
 *   - Title + coordinator line
 *   - Status pill via STATUS_BADGE_CLASSES lookup (Tailwind v4 static
 *     class compliance — CLAUDE.md never-do; no template literals).
 *   - Last-updated timestamp.
 *   - Three-dot DropdownMenu with status-appropriate quick actions:
 *       any         → Edit (routes to /admin/bips/[id]/edit; 404 stub
 *                     until Plan 03-07)
 *       pending     → + Review
 *       approved    → + Open public page ↗, + Un-approve (red)
 *
 * Un-approve reuses RejectBipModal from Plan 03-04 — no duplication of
 * the reason form / Server Action / state-machine guard.
 *
 * "Cards everywhere, no tables" (CLAUDE.md): this is a row-shaped card,
 * not a <table> row.
 */

import Link from 'next/link'
import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RejectBipModal } from './RejectBipModal'
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/utils/status'
import { cn } from '@/lib/utils/cn'
import { formatLongDate } from '@/lib/utils/dates'
import type { AdminBip } from '@/lib/queries/adminBips'

// ── Edit badge (T-08-18): literal class string — no template literals (Tailwind v4 / CLAUDE.md)
const EDIT_BADGE_CLASSES =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-eu-blue-50 text-eu-blue border-eu-blue-light'


interface AdminBipRowProps {
  bip: AdminBip
  /** 'edit' → show Edit badge after the status pill */
  kind?: 'submission' | 'edit'
  selectable?: boolean
  selected?: boolean
  onToggle?: (id: string, checked: boolean) => void
}

export function AdminBipRow({ bip, kind, selectable, selected, onToggle }: AdminBipRowProps) {
  const [rejectOpen, setRejectOpen] = useState(false)

  return (
    <article
      className={`flex items-center gap-3 rounded-md border bg-white px-4 py-3 transition hover:border-border-strong ${selected ? 'border-eu-blue bg-eu-blue-50/30' : 'border-border'}`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) => onToggle?.(bip.id, e.target.checked)}
          className="h-4 w-4 shrink-0 accent-eu-blue"
          aria-label={`Select ${bip.title || 'Untitled BIP'}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink">
          {bip.title || 'Untitled BIP'}
        </h3>
        <p className="truncate text-xs text-muted">
          {bip.coordinator_name ?? 'Unknown coordinator'}
          {bip.coordinator_university
            ? ` · ${bip.coordinator_university}`
            : ''}
        </p>
      </div>
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
          STATUS_BADGE_CLASSES[bip.status],
        )}
      >
        {STATUS_LABELS[bip.status]}
      </span>
      {/* Edit type badge — D-08 / T-08-18: literal class string, no concat */}
      {kind === 'edit' && (
        <span className={EDIT_BADGE_CLASSES}>Edit</span>
      )}
      <span className="hidden text-xs text-muted md:inline">
        Updated {formatLongDate(bip.updated_at)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${bip.title || 'Untitled BIP'}`}
            />
          }
        >
          <MoreHorizontal size={18} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/admin/bips/${bip.id}/edit`} />}
          >
            Edit
          </DropdownMenuItem>
          {bip.status === 'pending' && (
            <DropdownMenuItem
              render={<Link href={`/admin/bips/${bip.id}/review`} />}
            >
              Review
            </DropdownMenuItem>
          )}
          {bip.status === 'approved' && (
            <>
              <DropdownMenuItem
                render={
                  <Link
                    href={`/bip/${bip.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Open public page ↗
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-status-rejected focus:text-status-rejected"
                onClick={() => setRejectOpen(true)}
              >
                Un-approve
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        Un-approve mounts the same RejectBipModal from Plan 03-04. Only
        rendered for approved rows so the modal portal isn't created
        unnecessarily for drafts / pending / rejected rows.
      */}
      {bip.status === 'approved' && (
        <RejectBipModal
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          bipId={bip.id}
          bipTitle={bip.title}
          coordinatorName={bip.coordinator_name ?? ''}
        />
      )}
    </article>
  )
}
