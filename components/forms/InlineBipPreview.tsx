'use client'

/**
 * InlineBipPreview — the embedded Step-5 preview, shared by the submit flow
 * (WizardStep5Preview) and the approved-BIP edit flow (WizardStep5EditPreview).
 *
 * WHY THIS IS SINGLE-COLUMN
 *
 * The wizard shell is a `max-w-[760px]` card with `px-8` padding, so the preview
 * gets roughly a 696px content box. The previous version rendered the detail
 * page's desktop grid (`lg:grid-cols-[1fr_340px]`) inside it, and Tailwind's
 * `lg:` keys off the VIEWPORT, not the container — so on any desktop the 696px
 * box split into a 340px sidebar plus a ~330px body column, crushing the
 * description, gallery and partner cards to phone width. Below 1024px it was
 * worse: `BipSidebar` is `hidden lg:block`, so the sidebar vanished and the
 * preview showed no ECTS, dates, language, level, deadline or city at all.
 *
 * So this renders the SAME components the public page uses, in the single-column
 * composition that page already uses below lg (see app/(public)/bip/[slug]:
 * cover → header → inline BipKeyFacts card → body). Nothing here is a mock-up of
 * the real page; it is the real page's narrow layout, which is the honest way to
 * render it at 696px. <FullPagePreview> remains the wide, two-column, faithful
 * top-to-bottom render.
 *
 * The deadline chip rides on top of the key-facts card because the sidebar
 * (desktop) and BipMobileApplyBar (mobile) that normally carry it are both
 * absent here — without it the deadline would appear nowhere in the preview.
 *
 * Deliberately omitted: Apply CTA, Save and Share. They are live-page
 * affordances that do nothing in a preview, and Share would build a URL from a
 * slug that does not exist yet.
 */

import { BipCover } from '@/components/bip/BipCover'
import { BipHeader } from '@/components/bip/BipHeader'
import { BipKeyFacts } from '@/components/bip/BipKeyFacts'
import { BipBody } from '@/components/bip/BipBody'
import { DeadlineBadge } from '@/components/bip/DeadlineBadge'
import type { BipDetail } from '@/lib/queries/bipDetail'

export function InlineBipPreview({ bip }: { bip: BipDetail }) {
  return (
    <div className="min-w-0">
      <BipCover bip={bip} />
      <BipHeader bip={bip} />

      {/* Facts card — the sidebar's content, inlined at full width. */}
      <div className="mb-10 rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <DeadlineBadge deadline={bip.application_deadline} />
        </div>
        <BipKeyFacts bip={bip} />
      </div>

      <BipBody bip={bip} />
    </div>
  )
}
