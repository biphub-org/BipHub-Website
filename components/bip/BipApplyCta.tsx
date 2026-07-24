'use client'

import Link from 'next/link'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { computeDeadlineState } from '@/lib/utils/deadline'
import { cn } from '@/lib/utils/cn'

/**
 * BipApplyCta — three-branch Apply CTA (DETL-07).
 *
 * Branch 1 (closed): deadline passed → disabled gray "Applications closed" button
 * Branch 2 (url):    how_to_apply_type='url' → external link "Apply via host university →"
 * Branch 3 (contact): how_to_apply_type='contact' → mailto "Email coordinator →"
 * Default: disabled fallback (no method set)
 *
 * Used by both BipSidebar (fullWidth=true) and BipMobileApplyBar.
 */
/** The CTA's trailing arrow, nudged right on hover. Decorative — the link text
 *  carries the meaning, so it is hidden from assistive tech. */
function CtaArrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
    >
      →
    </span>
  )
}

export function BipApplyCta({
  bip,
  fullWidth = false,
}: {
  bip: BipDetail
  fullWidth?: boolean
}) {
  const { state } = computeDeadlineState(bip.application_deadline)
  const closed = state === 'closed'

  const baseClass = cn(
    'group inline-flex items-center justify-center gap-1 px-5 py-3 rounded-pill font-semibold text-base',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
    fullWidth && 'w-full',
  )

  // Live-CTA hover, per the mockup's `.btn-primary:hover`: 1px lift + shadow.
  // Kept off `baseClass` so the two disabled branches stay inert.
  const activeClass =
    'bg-eu-blue text-white hover:bg-eu-blue-dark hover:-translate-y-px hover:shadow-md'

  if (closed) {
    return (
      <button
        disabled
        className={cn(baseClass, 'bg-border text-muted cursor-not-allowed')}
      >
        Applications closed
      </button>
    )
  }

  if (bip.how_to_apply_type === 'url' && bip.how_to_apply_value) {
    return (
      <Link
        href={bip.how_to_apply_value}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(baseClass, activeClass)}
      >
        Apply via host university
        <CtaArrow />
      </Link>
    )
  }

  if (bip.how_to_apply_type === 'contact' && bip.contact_email) {
    return (
      <a
        href={`mailto:${bip.contact_email}`}
        className={cn(baseClass, activeClass)}
      >
        Email coordinator
        <CtaArrow />
      </a>
    )
  }

  // Default: no application method provided
  return (
    <button
      disabled
      className={cn(baseClass, 'bg-border text-muted cursor-not-allowed')}
      title="No application method provided"
    >
      Apply now
    </button>
  )
}
