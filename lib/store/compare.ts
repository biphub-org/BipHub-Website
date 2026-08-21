'use client'

/**
 * Compare store — client state for DISC-08/09 + GROW-01 shortlist.
 *
 * URL `?ids=a,b,c` on /bips/compare is the sole source of truth for sharing
 * (no server table, no RLS/GDPR, works incognito). This store is the LOCAL
 * persistence layer for the /bips browsing experience: the user ticks cards on
 * /bips, the ids survive a refresh via localStorage, and the "Compare" bar
 * builds the shareable URL from the store. The compare page itself reads
 * ?ids= directly (not the store) so a shared link renders without the
 * sharer's localStorage.
 *
 * Cap 3 — fits 3-col desktop without horizontal scroll (open-question #3).
 * localStorage key biphub:compare (mirrors biphub:bookmarks convention).
 */

import { create } from 'zustand'

const STORAGE_KEY = 'biphub:compare'
const MAX_COMPARE = 3

interface CompareState {
  ids: string[]
  hydrated: boolean
  hydrate: () => void
  toggle: (id: string) => boolean // returns true if toggled, false if at cap
  remove: (id: string) => void
  clear: () => void
  canAdd: boolean
}

function load(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_COMPARE)
  } catch {
    return []
  }
}

function persist(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    if (ids.length === 0) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // quota or private mode — ignore
  }
}

export const useCompareStore = create<CompareState>((set, get) => ({
  ids: [],
  hydrated: false,
  canAdd: true,

  hydrate: () => {
    const ids = load()
    set({ ids, hydrated: true, canAdd: ids.length < MAX_COMPARE })
  },

  toggle: (id: string) => {
    const { ids } = get()
    const exists = ids.includes(id)
    let next: string[]
    if (exists) {
      next = ids.filter((x) => x !== id)
    } else {
      if (ids.length >= MAX_COMPARE) return false
      next = [...ids, id]
    }
    persist(next)
    set({ ids: next, canAdd: next.length < MAX_COMPARE })
    return true
  },

  remove: (id: string) =>
    set((s) => {
      const next = s.ids.filter((x) => x !== id)
      persist(next)
      return { ids: next, canAdd: next.length < MAX_COMPARE }
    }),

  clear: () =>
    set(() => {
      persist([])
      return { ids: [], canAdd: true }
    }),
}))

export const COMPARE_MAX = MAX_COMPARE
export const COMPARE_STORAGE_KEY = STORAGE_KEY
