import { z } from 'zod'

const Uuid = z.string().uuid()

/**
 * Pure parser for the legacy `biphub:bookmarks` localStorage value (STUD-06 / D-02).
 *
 * Defensive by contract: any non-array, malformed JSON, or absent value yields [].
 * Returned IDs are valid UUIDs only, de-duplicated (so an upsert is idempotent).
 * No real v1.0 data exists (D-02a) — this is a best-effort one-time sweep.
 *
 * No imports from react, next, or @/lib/supabase — safe to unit-test in isolation.
 */
export function parseLegacyBookmarkIds(raw: string | null): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  for (const item of parsed) {
    if (typeof item === 'string' && Uuid.safeParse(item).success) {
      seen.add(item)
    }
  }
  return [...seen]
}
