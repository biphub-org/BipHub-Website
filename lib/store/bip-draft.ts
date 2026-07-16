/**
 * Zustand draft store for the BIP submission wizard (SUBM-01..SUBM-07).
 *
 * Mirrors the manual-hydration pattern from `lib/store/bookmarks.ts`:
 *   - SSR-safe (`typeof window === 'undefined'` guards on all localStorage access).
 *   - Hydrate exactly once via `hydrate()` called from a `useEffect` on mount.
 *   - localStorage is NOT auto-persisted on every change. Persistence happens:
 *       1. when the wizard observes a `SIGNED_OUT` auth event (SUBM-07), or
 *       2. when `saveDraftAction` returns `{ error: 'auth' }` (belt-and-suspenders).
 *   - `clearDraft()` removes the localStorage entry and resets in-memory state;
 *     called by Plan 02-07 after a successful submission.
 *
 * `hydrateFromServer` lets Plan 02-07's edit-mode page pre-populate the store
 * from a server-fetched record without going through localStorage.
 */

import { create } from 'zustand'

const DRAFT_STORAGE_KEY = 'biphub:draft'

export type Step3PartnerDraft = {
  university_id: string | null
  name: string
  country: string
  isVerified: boolean
}

export type BipDraftData = {
  // Step 1
  title?: string
  subject_areas?: string[]
  description?: string
  learning_outcomes?: string
  // Step 2
  virtual_component_description?: string
  virtual_timing?: 'before' | 'after' | 'concurrent'
  host_city?: string
  physical_start_date?: string
  physical_end_date?: string
  application_deadline?: string
  ects_credits?: number
  max_participants?: number
  study_levels?: Array<'bachelor' | 'master' | 'phd'>
  language_of_instruction?: string
  language_level_min?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'none'
  // Step 3 — partner_universities is preserved in Zustand/localStorage only
  // until submission; saveDraftAction strips it (foreign-key requires bip_id).
  partner_universities?: Step3PartnerDraft[]
  // Step 4
  green_travel?: boolean
  inclusion_support?: boolean
  eligibility_notes?: string
  how_to_apply_type?: 'url' | 'contact'
  how_to_apply_url?: string
  contact_name?: string
  contact_email?: string
}

export type SaveStatus = 'idle' | 'saving' | 'failed'

type BipDraftStore = {
  bipId: string | null
  currentStep: number
  draft: BipDraftData
  lastKnownUpdatedAt: string | null
  saveStatus: SaveStatus
  hydrated: boolean

  setBipId: (id: string) => void
  setCurrentStep: (step: number) => void
  mergeDraft: (partial: Partial<BipDraftData>) => void
  setLastKnownUpdatedAt: (ts: string) => void
  setSaveStatus: (status: SaveStatus) => void
  hydrate: () => void
  hydrateFromServer: (record: { id: string; data: BipDraftData; updatedAt: string }) => void
  persistToLocalStorage: () => void
  clearDraft: () => void
}

export const useBipDraft = create<BipDraftStore>((set, get) => ({
  bipId: null,
  currentStep: 1,
  draft: {},
  lastKnownUpdatedAt: null,
  saveStatus: 'idle',
  hydrated: false,

  setBipId: (id) => set({ bipId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),
  mergeDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  setLastKnownUpdatedAt: (ts) => set({ lastKnownUpdatedAt: ts }),
  setSaveStatus: (status) => set({ saveStatus: status }),

  hydrate: () => {
    if (typeof window === 'undefined') return
    if (get().hydrated) return // only hydrate once
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (!raw) {
        set({ hydrated: true })
        return
      }
      const parsed = JSON.parse(raw) as {
        draft?: BipDraftData
        bipId?: string | null
      }
      set({
        draft: parsed.draft ?? {},
        bipId: parsed.bipId ?? null,
        hydrated: true,
      })
    } catch {
      // JSON.parse error or storage access blocked — best-effort.
      set({ hydrated: true })
    }
  },

  // Edit-mode entry point (Plan 02-07): pre-populates from a server-fetched record.
  hydrateFromServer: (record) =>
    set({
      bipId: record.id,
      draft: record.data,
      lastKnownUpdatedAt: record.updatedAt,
      hydrated: true,
    }),

  persistToLocalStorage: () => {
    if (typeof window === 'undefined') return
    const { draft, bipId } = get()
    try {
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ draft, bipId }),
      )
    } catch {
      // Quota exceeded or storage access blocked — best-effort (SUBM-07).
    }
  },

  clearDraft: () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY)
      } catch {
        // ignore — draft is wiped from memory anyway
      }
    }
    set({
      bipId: null,
      currentStep: 1,
      draft: {},
      lastKnownUpdatedAt: null,
      saveStatus: 'idle',
    })
  },
}))
