'use client'

/**
 * BipSaveButton — thin wrapper around SaveToggleIsland in button mode.
 *
 * Used on the /bip/[slug] detail page sidebar and mobile bar.
 * Provides a stable named import so the detail-page wiring stays declarative
 * without the page components needing to know about displayStyle plumbing.
 */

import { SaveToggleIsland } from '@/components/bip/SaveToggleIsland'

export interface BipSaveButtonProps {
  bipId: string
  bipTitle: string
  initialSaved: boolean
  isStudent: boolean
  className?: string
}

export function BipSaveButton({
  bipId,
  bipTitle,
  initialSaved,
  isStudent,
  className,
}: BipSaveButtonProps) {
  return (
    <SaveToggleIsland
      bipId={bipId}
      bipTitle={bipTitle}
      initialSaved={initialSaved}
      isStudent={isStudent}
      displayStyle="button"
      className={className}
    />
  )
}
