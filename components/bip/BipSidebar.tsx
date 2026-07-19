'use client'

import type { BipDetail } from '@/lib/queries/bipDetail'
import { DeadlineBadge } from '@/components/bip/DeadlineBadge'
import { BipApplyCta } from '@/components/bip/BipApplyCta'
import { ShareButton } from '@/components/bip/ShareButton'
import { formatLongDateRange } from '@/lib/utils/dates'

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

  const host = bip.host_university
  const datesLine =
    formatLongDateRange(bip.physical_start_date, bip.physical_end_date) ?? 'TBC'

  const targetGroupLabel: Record<string, string> = {
    students: 'Students',
    staff: 'Staff',
    students_staff: 'Students/Staff',
  }

  return (
    <aside
      aria-label="Key facts"
      className="hidden lg:block sticky top-[88px] self-start"
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

        {/* Key facts list */}
        <div className="mt-6 pt-6 border-t border-border">
          <h2 className="text-sm font-bold text-ink mb-3">Key facts</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">ECTS</dt>
              <dd className="text-ink font-semibold">{bip.ects_credits ?? '–'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Dates</dt>
              <dd className="text-ink text-right">{datesLine}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Language</dt>
              <dd className="text-ink font-semibold">
                {bip.language_of_instruction
                  ? bip.language_of_instruction.toUpperCase()
                  : '–'}
              </dd>
            </div>
            {bip.target_group && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Open to</dt>
                <dd className="text-ink font-semibold text-right">
                  {targetGroupLabel[bip.target_group] ?? bip.target_group}
                </dd>
              </div>
            )}
            {/* DETL-05 CEFR language level */}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Min level</dt>
              <dd className="text-ink font-semibold">
                {bip.language_level_min ?? '–'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">City</dt>
              <dd className="text-ink text-right">
                {bip.host_city ?? host?.city ?? '–'}
              </dd>
            </div>
          </dl>
        </div>

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
