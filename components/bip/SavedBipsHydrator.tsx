'use client'

/**
 * SavedBipsHydrator — populates the client saved-BIPs store once per page load.
 *
 * Rendered once on every page that shows a SaveToggleIsland: /bips, /bip/[slug],
 * /student-dashboard/saved, and the homepage. This is what lets those ISR pages
 * stay cookie-free server-side (D-bip-02-03) — the per-user saved set is fetched
 * here via a Server Action after hydration rather than during the server render.
 * Renders nothing.
 */

import { useEffect } from 'react'
import { getSavedStateAction } from '@/lib/actions/saved-bips'
import { useSavedBipsStore } from '@/lib/store/saved-bips'

export function SavedBipsHydrator() {
  const hydrated = useSavedBipsStore((s) => s.hydrated)
  const hydrate = useSavedBipsStore((s) => s.hydrate)

  useEffect(() => {
    if (hydrated) return
    let active = true
    getSavedStateAction()
      .then((state) => {
        if (active) hydrate(state.savedIds, state.isStudent)
      })
      .catch(() => {
        /* best-effort: hearts stay in their SSR fallback state */
      })
    return () => {
      active = false
    }
  }, [hydrated, hydrate])

  return null
}
