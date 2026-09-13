'use client'

import Link from 'next/link'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { computeDeadlineState } from '@/lib/utils/deadline'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

/**
 * BipApplyCta — three-branch Apply CTA (DETL-07).
 *
 * Branch 1 (closed): deadline passed → disabled gray "Applications closed" button
 * Branch 2 (url):    how_to_apply_type='url' → external link "Apply via host university →"
 * Branch 3 (contact): how_to_apply_type='contact' → mailto "Email coordinator →"
 * Default: disabled fallback (no method set)
 *
 * All branches render the shared <Button> (primary lg) so the apply CTA
 * always matches the CTA design contract (see tests/components/button.test.tsx).
 * The trailing arrow keeps its right-nudge on hover.
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

  if (closed) {
    return (
      <Button
        disabled
        className={cn(
          'bg-border text-muted border-border cursor-not-allowed',
          fullWidth && 'w-full',
        )}
      >
        Applications closed
      </Button>
    )
  }

  if (bip.how_to_apply_type === 'url' && bip.how_to_apply_value) {
    return (
      <Button
        variant="primary"
        size="lg"
        asChild
        className={cn('group gap-1', fullWidth && 'w-full')}
      >
        <Link
          href={bip.how_to_apply_value}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apply via host university
          <CtaArrow />
        </Link>
      </Button>
    )
  }

  if (bip.how_to_apply_type === 'contact' && bip.contact_email) {
    return (
      <Button
        variant="primary"
        size="lg"
        asChild
        className={cn('group gap-1', fullWidth && 'w-full')}
      >
        <a href={`mailto:${bip.contact_email}`}>
          Email coordinator
          <CtaArrow />
        </a>
      </Button>
    )
  }

  // Default: no application method provided
  return (
    <Button
      disabled
      title="No application method provided"
      className={cn(
        'bg-border text-muted border-border cursor-not-allowed',
        fullWidth && 'w-full',
      )}
    >
      Apply now
    </Button>
  )
}
