'use server'

/**
 * Saved-BIPs Server Actions (STUD-04 / STUD-05 / STUD-06 server half).
 *
 * Contract:
 *   - `'use server'` at file top — every export is a Server Action.
 *   - JWT validation via `getClaims()` ONLY (CLAUDE.md never-do; PITFALLS Pitfall 1).
 *   - `await createClient()` (factory awaits `cookies()` internally; PITFALLS Pitfall 3).
 *   - Only `createClient()` (anon key + RLS) — NEVER the admin client.
 *   - Return type `Promise<{ error?: string }>` — never throw, never redirect.
 *     The SaveToggleIsland toasts on result.error; the user stays in place.
 *   - NO revalidatePath on /bips — save/unsave is user-specific and must not
 *     bust the shared ISR cache (D-01 / RESEARCH Pitfall 4).
 */

import { createClient } from '@/lib/supabase/server'
import { SaveBipSchema } from '@/lib/schemas/saved-bips'
import { getSavedBipIds } from '@/lib/queries/savedBips'

/**
 * Resolve the caller's saved-BIP state for client-side hydration (D-bip-02-03).
 *
 * Called from SavedBipsHydrator on mount so /bips and /bip/[slug] can stay ISR
 * (cookie-free server render — see lib/store/saved-bips.ts). Returns the user's
 * saved bip IDs and whether they are a signed-in student. Anonymous / invalid-JWT
 * callers get an empty set and isStudent=false. Reading cookies here is fine: a
 * Server Action runs at request time on the client's behalf, not during the
 * page's static render, so it does not opt the page out of ISR.
 */
export async function getSavedStateAction(): Promise<{ savedIds: string[]; isStudent: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return { savedIds: [], isStudent: false }
  const isStudent = data.claims.app_metadata?.role === 'student'
  const ids = await getSavedBipIds(data.claims.sub)
  return { savedIds: [...ids], isStudent }
}

/**
 * Internal helper — resolves the caller's user_id from the signed JWT.
 * Returns null if unauthenticated or if JWT is invalid.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  return data.claims.sub
}

/**
 * Save a BIP to the signed-in student's saved list.
 *
 * Uses upsert with ignoreDuplicates: true so double-clicks are idempotent
 * (RESEARCH Pattern 4 / STRIDE T-06-11).
 *
 * Security:
 *   - user_id always derived from validated JWT (T-06-07).
 *   - bipId validated as UUID via SaveBipSchema (T-06-08).
 *   - createClient() uses anon key; RLS restricts insert to own rows (T-06-10).
 */
export async function saveAction(bipId: string): Promise<{ error?: string }> {
  const parsed = SaveBipSchema.safeParse({ bipId })
  if (!parsed.success) return { error: 'Invalid BIP id.' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData?.claims?.sub) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('saved_bips')
    .upsert(
      { user_id: claimsData.claims.sub, bip_id: parsed.data.bipId },
      { onConflict: 'user_id,bip_id', ignoreDuplicates: true },
    )
  if (error) return { error: error.message }
  // NOTE: do NOT call revalidatePath on /bips — user-specific state must not bust ISR (Pitfall 4).
  return {}
}

/**
 * Remove a BIP from the signed-in student's saved list.
 *
 * Security: same as saveAction — user_id from JWT, bipId validated.
 * RLS DELETE policy ensures only the row owner can delete.
 */
export async function unsaveAction(bipId: string): Promise<{ error?: string }> {
  const parsed = SaveBipSchema.safeParse({ bipId })
  if (!parsed.success) return { error: 'Invalid BIP id.' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData?.claims?.sub) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('saved_bips')
    .delete()
    .eq('user_id', claimsData.claims.sub)
    .eq('bip_id', parsed.data.bipId)
  if (error) return { error: error.message }
  return {}
}

/**
 * One-time sweep: migrate legacy `biphub:bookmarks` localStorage IDs to the
 * server-side saved list (STUD-06 / D-02).
 *
 * Accepts the raw localStorage value (string | array) from the client island.
 * Steps:
 *   1. Parse + UUID-validate via parseLegacyBookmarkIds (pure function, Plan 01).
 *   2. Validate each UUID against the `bips` table — skip unknown IDs (D-02 / T-06-11).
 *   3. Batch upsert with ignoreDuplicates — idempotent (safe to call multiple times).
 *
 * Returns `{ migrated: number }` on success or `{ migrated: 0, error: string }` on failure.
 * The client island ignores errors (D-02: best-effort sweep, no UI for failure).
 */
export async function migrateLegacyBookmarksAction(
  rawIds: unknown,
): Promise<{ migrated: number; error?: string }> {
  // Defensive: accept the raw localStorage value (string | array) and parse to valid UUIDs.
  const raw = typeof rawIds === 'string' ? rawIds : JSON.stringify(rawIds ?? [])
  // parseLegacyBookmarkIds is the pure, unit-tested core (Plan 01).
  const { parseLegacyBookmarkIds } = await import('@/lib/legacy-bookmarks')
  const ids = parseLegacyBookmarkIds(raw)
  if (ids.length === 0) return { migrated: 0 }

  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData?.claims?.sub) return { migrated: 0, error: 'Not authenticated.' }
  const userId = claimsData.claims.sub

  // Validate each ID against the bips table — skip unknowns (D-02 / T-06-11).
  const { data: known } = await supabase.from('bips').select('id').in('id', ids)
  const knownIds = new Set((known ?? []).map((r) => r.id))
  const rows = ids.filter((id) => knownIds.has(id)).map((id) => ({ user_id: userId, bip_id: id }))
  if (rows.length === 0) return { migrated: 0 }

  const { error } = await supabase
    .from('saved_bips')
    .upsert(rows, { onConflict: 'user_id,bip_id', ignoreDuplicates: true })
  if (error) return { migrated: 0, error: error.message }
  return { migrated: rows.length }
}
