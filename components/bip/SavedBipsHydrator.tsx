'use client'

/**
 * SavedBipsHydrator — populates the client saved-BIPs store on every mount.
 *
 * Rendered once on every page that shows a SaveToggleIsland: /bips, /bip/[slug],
 * /student-dashboard/saved, and the homepage. This is what lets those ISR pages
 * stay cookie-free server-side (D-bip-02-03) — the per-user saved set is fetched
 * here via a Server Action after hydration rather than during the server render.
 * Renders nothing.
 *
 * Revalidates on every mount (not just the first): the zustand store survives
 * client-side navigation, so a fetch-once guard would leave role/saved state
 * stale across sign-in/out until a full page reload.
 */

import { useEffect } from 'react'
import { getSavedStateAction } from '@/lib/actions/saved-bips'
import { useSavedBipsStore } from '@/lib/store/saved-bips'

export function SavedBipsHydrator() {
  useEffect(() => {
    let active = true
    getSavedStateAction()
      .then((state) => {
        if (!active) return
        const { hydrated, hydrate, refresh } = useSavedBipsStore.getState()
        const apply = hydrated ? refresh : hydrate
        apply(state.savedIds, state.isStudent, state.isSignedIn)
      })
      .catch(() => {
        /* best-effort: hearts stay in their SSR fallback state */
      })
    return () => {
      active = false
    }
  }, [])

  return null
}
