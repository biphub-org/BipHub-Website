'use client'

/**
 * Client store for per-user saved-BIP state (Phase 6 / D-bip-02-03 ISR fix).
 *
 * Why this exists: /bips and /bip/[slug] are ISR (revalidate=3600). Computing
 * per-user saved state server-side via getClaims() reads the session cookie,
 * which opted those routes out of ISR for EVERY visitor (confirmed dynamic ƒ).
 * Instead the pages now render cookie-free (ISR preserved) and the per-user
 * saved set is fetched client-side after mount via getSavedStateAction(), held
 * here. SaveToggleIsland reads from this store; SavedBipsHydrator populates it
 * once per page load.
 *
 * Mirrors the manual-hydration pattern used by lib/store/bip-draft.ts.
 */

import { create } from 'zustand'

interface SavedBipsState {
  savedIds: Set<string>
  isStudent: boolean
  /** True for any authenticated role. Lets the save button tell signed-out
   * visitors (button visible) apart from coordinators/admins (button hidden). */
  isSignedIn: boolean
  hydrated: boolean
  /**
   * Populate from the server on first load. Unions with any optimistic ids
   * already present so a click that lands during the initial fetch is not lost.
   */
  hydrate: (ids: string[], isStudent: boolean, isSignedIn: boolean) => void
  /**
   * Revalidate on later page visits (the store survives client-side
   * navigation, so without this the role/saved set goes stale until a full
   * reload). Replaces savedIds with server truth — by revalidation time any
   * in-flight toggle from a previous page has either committed or reverted.
   */
  refresh: (ids: string[], isStudent: boolean, isSignedIn: boolean) => void
  add: (bipId: string) => void
  remove: (bipId: string) => void
}

export const useSavedBipsStore = create<SavedBipsState>((set) => ({
  savedIds: new Set<string>(),
  isStudent: false,
  isSignedIn: false,
  hydrated: false,
  hydrate: (ids, isStudent, isSignedIn) =>
    set((s) => ({
      savedIds: new Set<string>([...s.savedIds, ...ids]),
      isStudent,
      isSignedIn,
      hydrated: true,
    })),
  refresh: (ids, isStudent, isSignedIn) =>
    set({
      savedIds: new Set<string>(ids),
      isStudent,
      isSignedIn,
      hydrated: true,
    }),
  add: (bipId) =>
    set((s) => {
      const next = new Set(s.savedIds)
      next.add(bipId)
      return { savedIds: next }
    }),
  remove: (bipId) =>
    set((s) => {
      const next = new Set(s.savedIds)
      next.delete(bipId)
      return { savedIds: next }
    }),
}))
