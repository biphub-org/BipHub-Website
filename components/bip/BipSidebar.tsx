'use client'

import type { BipDetail } from '@/lib/queries/bipDetail'
import { DeadlineBadge } from '@/components/bip/DeadlineBadge'
import { BipApplyCta } from '@/components/bip/BipApplyCta'
import { BipKeyFacts } from '@/components/bip/BipKeyFacts'
import { ShareButton } from '@/components/bip/ShareButton'
import { cn } from '@/lib/utils/cn'

/**
 * BipSidebar — sticky 340px right column at lg+ (D-09 / UI-SPEC line 357).
 *
 * Renders:
 *   - Deadline countdown chip (DeadlineBadge)
 *   - Apply CTA button (full sidebar width, BipApplyCta)        ← public mode only
 *   - Save button slot (saveButton prop)                        ← public mode only
 *   - Key facts list (ECTS / Dates / Language / CEFR / City) — DETL-05
 *   - Action row: ShareButton                                   ← public mode only
 *
 * Sticky offset: top-[88px] accounts for 68px StickyNav + 20px breathing room.
 * Hidden on mobile (hidden lg:block) — mobile uses BipMobileApplyBar.
 *
 * Mode (Plan 03-03):
 *   - 'public' (default): unchanged Phase 1 behaviour.
 *   - 'admin-review': suppresses the Apply CTA AND the Share action row —
 *     admins viewing a pending submission must not be able to apply from
 *     inside the review surface.
 *
 * saveButton prop (Plan 06-02): rendered below the Apply CTA in public mode.
 * The caller (page.tsx RSC) constructs the BipSaveButton and passes it as
 * a ReactNode slot so BipSidebar never imports action plumbing directly.
 */
export type BipSidebarMode = 'public' | 'admin-review'

export function BipSidebar({
  bip,
  mode = 'public',
  saveButton,
}: {
  bip: BipDetail
  mode?: BipSidebarMode
  saveButton?: React.ReactNode
}) {
  const isAdminReview = mode === 'admin-review'
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/bip/${bip.slug}`
      : `https://biphub.eu/bip/${bip.slug}`

  return (
    <aside
      aria-label="Key facts"
      className={cn("hidden lg:block self-start", !isAdminReview && "sticky top-[88px]")}
    >
      <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
        {/* Deadline chip */}
        <DeadlineBadge deadline={bip.application_deadline} />

        {/* Apply CTA — full sidebar width. Suppressed in admin-review mode. */}
        {!isAdminReview && (
          <div className="mt-4">
            <BipApplyCta bip={bip} fullWidth />
          </div>
        )}

        {/* Save button slot — rendered below Apply CTA, suppressed in admin-review mode. */}
        {!isAdminReview && saveButton && (
          <div className="mt-2">
            {saveButton}
          </div>
        )}

        {/* Key facts — shared with the mobile copy rendered under the header. */}
        <BipKeyFacts bip={bip} className="mt-6 border-t border-border pt-6" />

        {/* Action row: Share. Suppressed in admin-review mode. */}
        {!isAdminReview && (
          <div className="mt-6 pt-6 border-t border-border">
            <ShareButton title={bip.title} url={url} />
          </div>
        )}
      </div>
    </aside>
  )
}
