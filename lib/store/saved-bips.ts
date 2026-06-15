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
  hydrated: boolean
  /**
   * Populate from the server once per page load. Unions with any optimistic ids
   * already present so a click that lands during the initial fetch is not lost.
   */
  hydrate: (ids: string[], isStudent: boolean) => void
  add: (bipId: string) => void
  remove: (bipId: string) => void
}

export const useSavedBipsStore = create<SavedBipsState>((set) => ({
  savedIds: new Set<string>(),
  isStudent: false,
  hydrated: false,
  hydrate: (ids, isStudent) =>
    set((s) => ({
      savedIds: new Set<string>([...s.savedIds, ...ids]),
      isStudent,
      hydrated: true,
    })),
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
