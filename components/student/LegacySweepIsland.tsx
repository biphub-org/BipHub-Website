'use client'

import { useEffect } from 'react'
import { migrateLegacyBookmarksAction } from '@/lib/actions/saved-bips'

const LEGACY_KEY = 'biphub:bookmarks'

/**
 * STUD-06 / D-02 — best-effort, one-time, idempotent sweep of legacy
 * localStorage bookmarks into server-side saved_bips. Silent no-op when the
 * key is absent (the expected case — the v1.0 store never shipped, D-02a).
 * Renders nothing.
 *
 * Mount-once useEffect: reads the legacy key, calls migrateLegacyBookmarksAction
 * with the raw value, then clears the key on success. On any error the sweep
 * fails silently — this is best-effort per D-02, not mission-critical.
 */
export function LegacySweepIsland() {
  useEffect(() => {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return // expected no-op
    migrateLegacyBookmarksAction(raw)
      .then(() => localStorage.removeItem(LEGACY_KEY))
      .catch(() => {
        /* best-effort: silent */
      })
  }, [])
  return null
}
