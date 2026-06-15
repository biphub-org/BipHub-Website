'use client'

import type { BipDetail } from '@/lib/queries/bipDetail'
import { CountdownText } from '@/components/bip/CountdownText'
import { BipApplyCta } from '@/components/bip/BipApplyCta'

/**
 * BipMobileApplyBar — fixed-bottom 64px Apply bar for mobile (<1024px) (D-10).
 *
 * UI-SPEC line 286: height 64px, full-width, white bg, top border, shadow-md.
 * z-30: matches UI-SPEC line 441 z-index ladder for mobile sticky bottom bar.
 *
 * Shown via the 'lg:hidden' wrapper in page.tsx — hidden at >=1024px.
 * Shows deadline label (CountdownText) on the left and Apply CTA on the right.
 *
 * saveButton slot (Plan 06-02): rendered between CountdownText and Apply CTA.
 * The caller (page.tsx RSC) constructs BipSaveButton and passes as ReactNode.
 */
export function BipMobileApplyBar({
  bip,
  saveButton,
}: {
  bip: BipDetail
  saveButton?: React.ReactNode
}) {
  return (
    <div
      role="region"
      aria-label="Apply"
      className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-border shadow-md px-4 flex items-center justify-between gap-3 z-30"
    >
      <div className="text-sm">
        <CountdownText deadline={bip.application_deadline} />
      </div>
      {saveButton && <div className="flex-shrink-0">{saveButton}</div>}
      <BipApplyCta bip={bip} />
    </div>
  )
}
