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
  className?: string
}

/**
 * Saved state is read from the client store (populated by <SavedBipsHydrator />),
 * so this wrapper does not need server-computed initialSaved / isStudent props —
 * keeping the /bip/[slug] detail page cookie-free and ISR-cached (D-bip-02-03).
 */
export function BipSaveButton({ bipId, bipTitle, className }: BipSaveButtonProps) {
  return (
    <SaveToggleIsland
      bipId={bipId}
      bipTitle={bipTitle}
      displayStyle="button"
      className={className}
    />
  )
}
