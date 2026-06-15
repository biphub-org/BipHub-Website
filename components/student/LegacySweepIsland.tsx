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
 * with the raw value, then clears the key only when the action reports no error.
 * The action resolves (never rejects) with `{ error }` on the not-authenticated
 * and DB-error paths, so clearing unconditionally would discard the legacy
 * bookmarks before they were actually swept. Keeping the key on error lets a
 * later authenticated load retry. On any error the sweep fails silently — this
 * is best-effort per D-02, not mission-critical.
 */
export function LegacySweepIsland() {
  useEffect(() => {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return // expected no-op
    migrateLegacyBookmarksAction(raw)
      .then((result) => {
        // Only clear once the sweep actually succeeded (migrated:0 with no
        // error is a successful no-op — junk/empty key — and is safe to clear).
        if (!result?.error) localStorage.removeItem(LEGACY_KEY)
      })
      .catch(() => {
        /* best-effort: silent */
      })
  }, [])
  return null
}
