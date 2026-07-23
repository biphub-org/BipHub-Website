'use client'

/**
 * FullPagePreview — a "View full page" button + a full-viewport overlay that
 * renders the BIP exactly as the public detail page will, from the LIVE wizard
 * draft (Step 5). Unlike the embedded Step-5 preview, this includes the hero
 * header (BipHeader) and uses the real detail-page container width / grid gaps,
 * so coordinators see a faithful top-to-bottom render before submitting.
 *
 * It reuses the exact detail-page components (BipHeader/BipBody/BipSidebar) fed
 * by the same `draftToBipDetail` adapter — so what shows here is what ships,
 * minus live-page affordances that don't apply to a preview (save button,
 * mobile apply bar, working breadcrumb).
 *
 * Rendered as a portal to <body> so it escapes the wizard's clipped/centered
 * layout. Esc closes; body scroll is locked while open.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize2, ArrowLeft, X } from 'lucide-react'
import { IconChevronLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { BipHeader } from '@/components/bip/BipHeader'
import { BipCover } from '@/components/bip/BipCover'
import { BipBody } from '@/components/bip/BipBody'
import { BipKeyFacts } from '@/components/bip/BipKeyFacts'
import { BipSidebar } from '@/components/bip/BipSidebar'
import type { BipDetail } from '@/lib/queries/bipDetail'

export function FullPagePreview({ bip }: { bip: BipDetail }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 border border-eu-blue/30 bg-white/70 text-eu-blue hover:bg-white"
      >
        <Maximize2 className="mr-2 h-4 w-4" />
        View full page
      </Button>
      <FullPagePreviewOverlay open={open} onClose={() => setOpen(false)}>
        <div className="container mx-auto max-w-[1200px] px-4 py-8 lg:px-6 lg:py-12">
          {/* Static breadcrumb — matches the live page visually (non-interactive here). */}
          <span className="mb-6 inline-flex items-center gap-1 text-sm text-muted">
            <IconChevronLeft size={16} aria-hidden="true" />
            All BIPs
          </span>
          <BipCover bip={bip} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:gap-12">
            <div>
              <BipHeader bip={bip} />
              {/* Mirrors the live page: key facts move inline below lg. */}
              <BipKeyFacts
                bip={bip}
                className="mb-8 rounded-lg border border-border bg-white p-5 shadow-sm lg:hidden"
              />
              <BipBody bip={bip} />
            </div>
            <BipSidebar bip={bip} />
          </div>
        </div>
      </FullPagePreviewOverlay>
    </>
  )
}

function FullPagePreviewOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  // Portal target only exists client-side; gate on mount to avoid a hydration
  // mismatch (the overlay is closed on first render anyway).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full-page BIP preview"
      className="fixed inset-0 z-[60] overflow-y-auto bg-white"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-eu-blue"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editing
        </button>
        <span className="hidden text-xs text-muted sm:block">
          Preview — not visible publicly until reviewed and approved.
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full p-1.5 text-muted transition-colors hover:bg-bg-soft hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>,
    document.body,
  )
}
