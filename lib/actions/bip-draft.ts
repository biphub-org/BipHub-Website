'use server'

/**
 * BIP draft Server Action (SUBM-02 / SUBM-06).
 *
 * Contract:
 *   - `'use server'` is file-level.
 *   - JWT validation uses `getClaims()` ONLY (CLAUDE.md never-do compliance).
 *   - On the very first auto-save (no `bipId` yet), we INSERT with a generated
 *     draft slug so the `bips.slug` NOT NULL constraint is satisfied (Pitfall 3).
 *     The slug is finalized at submission time by Plan 02-07's `submitBipAction`.
 *   - On subsequent saves, we UPDATE with optimistic locking via
 *     `.eq('updated_at', lastKnownUpdatedAt)`. When 0 rows match,
 *     `.maybeSingle()` returns `{ data: null }` and we surface
 *     `{ error: 'conflict' }` so the wizard can show the two-tab dialog.
 *   - `partner_universities` is not a `bips` column — partners live in the
 *     `bip_partner_universities` table — so it is stripped from the column
 *     payload and reconciled separately once a `bip_id` exists (see
 *     `reconcilePartners` below). It used to be dropped entirely, on the
 *     reasoning that submit would write it; but that left partners in Zustand
 *     memory only, so a hard refresh mid-draft re-hydrated from the DB and the
 *     list came back empty.
 *   - Slug is generated only on first INSERT; subsequent updates do NOT touch
 *     it. Status is hard-coded to `'draft'` on insert and never set on update
 *     — the RLS policy `bips_update_own_draft_or_pending` (migration 00006)
 *     forbids self-promotion to `approved`/`rejected`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateDraftSlug } from '@/lib/utils/slug'
import { toPartnerRows } from '@/lib/utils/partners'
import type { BipDraftData } from '@/lib/store/bip-draft'

export type SaveDraftResult =
  // `warning` reports a non-fatal partial save: the `bips` row committed (so
  // `updatedAt` is the caller's new lock and MUST be adopted) but the partner
  // reconciliation did not. Returning a plain error here instead would leave
  // the client holding a stale lock against a row whose updated_at just moved
  // — the exact false-"updated in another tab" conflict this file already
  // guards against elsewhere.
  | { success: true; bipId: string; updatedAt: string; warning?: string }
  | { error: 'conflict' }
  // The row exists and the lock still matches, but the UPDATE matched 0 rows —
  // i.e. RLS filtered it (a status this coordinator may not edit in place).
  // Distinct from 'conflict' so the wizard stops showing a two-tab dialog for
  // what is actually a permission/status problem (BUG-001 presented this way).
  | { error: 'forbidden'; message: string }
  | { error: 'auth' }
  | { error: 'unknown'; message: string }

/**
 * Delete-then-insert the partner rows for `bipId` (same reconciliation the
 * submit and admin-edit paths use). Returns a warning string on failure rather
 * than throwing — the caller has already committed the `bips` row and must
 * still hand its new lock back to the client.
 *
 * Only called when `partner_universities` is actually present on the incoming
 * payload: the debounced per-field auto-saves send a single step's fields, so
 * they skip this entirely. It runs on "Save & continue" (which sends the whole
 * merged draft) and on explicit retries — a handful of times per session.
 *
 * RLS: `bip_partners_insert_own` / `bip_partners_delete_own` (migration 00006)
 * gate on `bips.created_by` with no status predicate, so a draft-status row is
 * writable here without any policy change.
 */
async function reconcilePartners(
  supabase: SupabaseClient,
  bipId: string,
  partners: NonNullable<BipDraftData['partner_universities']>,
): Promise<string | undefined> {
  const { error: deleteError } = await supabase
    .from('bip_partner_universities')
    .delete()
    .eq('bip_id', bipId)
  if (deleteError) {
    console.error('[saveDraftAction] partner delete error:', deleteError.message)
    return 'Your partner universities could not be saved. They are still on screen — try saving again.'
  }

  const rows = toPartnerRows(bipId, partners)
  if (rows.length === 0) return undefined

  const { error: insertError } = await supabase
    .from('bip_partner_universities')
    .insert(rows)
  if (insertError) {
    console.error('[saveDraftAction] partner insert error:', insertError.message)
    return 'Your partner universities could not be saved. They are still on screen — try saving again.'
  }
  return undefined
}

export async function saveDraftAction(
  stepData: Partial<BipDraftData>,
  bipId: string | null,
  lastKnownUpdatedAt: string | null,
): Promise<SaveDraftResult> {
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'auth' }
  }
  const userId = claimsData.claims.sub

  // Reshape the wizard's flat draft into bips columns:
  //   - partner_universities: a separate table — lifted out of the column
  //     payload here and reconciled after the row write, once bipId is known.
  //   - how_to_apply_url: a form-only field. The bips column is
  //     `how_to_apply_value` — one column holding the URL or the contact email,
  //     discriminated by `how_to_apply_type`. Mirrors submitBipAction's transform;
  //     without this the UPDATE fails ("Could not find the 'how_to_apply_url'
  //     column") and Step 4 of the wizard can never save.
  const { partner_universities, how_to_apply_url, ...rest } = stepData

  // Presence of the KEY is the signal, not truthiness: a payload that omits it
  // (every debounced per-step auto-save) must leave the existing partner rows
  // alone, while an explicit `[]` means the coordinator removed the last
  // partner and the rows should go.
  const hasPartners = 'partner_universities' in stepData

  const howToApply =
    'how_to_apply_url' in stepData || 'how_to_apply_type' in stepData
      ? {
          how_to_apply_value:
            rest.how_to_apply_type === 'url'
              ? (how_to_apply_url ?? null)
              : (rest.contact_email ?? null),
        }
      : {}

  // Draft saves send the WHOLE partial draft (`{ ...draft, ...stepData }`),
  // including fields the coordinator has not filled. Empty HTML date/number
  // inputs arrive as `''`, which Postgres rejects for date/numeric columns
  // ("invalid input syntax for type date: \"\""), failing the save from any
  // step once a blank date is present. Coerce `'' → null` so partial drafts
  // persist; every affected column is nullable, so null is always valid.
  // virtual_session_dates is a date[] column — the wizard sends the whole list
  // including empty-string placeholders for un-filled rows. Drop the blanks; an
  // all-blank list collapses to null (nullable column) so partial drafts save.
  const rawDates = rest.virtual_session_dates
  const cleanedDates = Array.isArray(rawDates)
    ? rawDates.map((d) => (typeof d === 'string' ? d.trim() : d)).filter(Boolean)
    : rawDates
  const withDates =
    rawDates !== undefined
      ? {
          ...rest,
          virtual_session_dates:
            Array.isArray(cleanedDates) && cleanedDates.length === 0
              ? null
              : cleanedDates,
        }
      : rest

  const persistableRaw = { ...withDates, ...howToApply }
  const persistable = Object.fromEntries(
    Object.entries(persistableRaw).map(([k, v]) => [k, v === '' ? null : v]),
  ) as typeof persistableRaw

  // An existing draft must NEVER fall through to the INSERT branch — that
  // creates a duplicate row and orphans the original. The lock can legitimately
  // be missing here (a localStorage entry written before it was persisted), so
  // recover it from the row itself rather than inserting.
  let lockValue = lastKnownUpdatedAt
  if (bipId && !lockValue) {
    const { data: current } = await supabase
      .from('bips')
      .select('updated_at')
      .eq('id', bipId)
      .eq('created_by', userId)
      .maybeSingle()
    // No row (deleted, or not ours) → genuinely nothing to update; fall through
    // to INSERT so the coordinator does not lose the draft they are typing.
    if (current?.updated_at) lockValue = current.updated_at
  }

  if (bipId && lockValue) {
    // UPDATE with optimistic locking — only succeeds if updated_at matches.
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('bips')
      .update({ ...persistable, updated_at: now })
      .eq('id', bipId)
      .eq('created_by', userId)
      .eq('updated_at', lockValue)
      .select('id, updated_at')
      .maybeSingle()

    if (error) {
      console.error('[saveDraftAction] update error:', error.message)
      return { error: 'unknown', message: error.message }
    }

    // 0 rows matched. That is NOT automatically a two-tab conflict: an UPDATE
    // filtered by RLS (a status this coordinator cannot edit in place) returns
    // 0 rows too. Probe the row to tell the two apart before blaming a
    // phantom second tab.
    if (!data) {
      const { data: probe } = await supabase
        .from('bips')
        .select('updated_at')
        .eq('id', bipId)
        .eq('created_by', userId)
        .maybeSingle()

      if (!probe) {
        return {
          error: 'forbidden',
          message: 'This draft is no longer available on your account.',
        }
      }
      // Timestamp moved on → a real concurrent write.
      if (new Date(probe.updated_at).getTime() !== new Date(lockValue).getTime()) {
        return { error: 'conflict' }
      }
      // Row still there, lock still current → the UPDATE itself was refused.
      return {
        error: 'forbidden',
        message:
          'This BIP can no longer be edited directly in its current status.',
      }
    }

    const warning = hasPartners
      ? await reconcilePartners(supabase, data.id, partner_universities ?? [])
      : undefined

    return {
      success: true,
      bipId: data.id,
      updatedAt: data.updated_at,
      warning,
    }
  }

  // First INSERT — generate a draft slug to satisfy bips.slug NOT NULL.
  // host_university_id is server-authoritative: it comes from the coordinator's
  // profile-locked university, never from client input. The (dashboard) layout
  // + bips/new page already gate on a complete profile, so this is normally
  // guaranteed — the guard is defense-in-depth.
  const { data: profile } = await supabase
    .from('profiles')
    .select('university_id')
    .eq('id', userId)
    .maybeSingle()
  if (!profile?.university_id) {
    return {
      error: 'unknown',
      message: 'No host university on your profile — complete onboarding first.',
    }
  }

  const draftSlug = generateDraftSlug(stepData.title ?? 'untitled')
  const { data, error } = await supabase
    .from('bips')
    .insert({
      ...persistable,
      created_by: userId,
      host_university_id: profile.university_id,
      status: 'draft',
      slug: draftSlug,
      title: stepData.title ?? 'Untitled BIP',
    })
    .select('id, updated_at')
    .single()

  if (error) {
    console.error('[saveDraftAction] insert error:', error.message)
    return { error: 'unknown', message: error.message }
  }

  // Partners cannot exist before the row does (Step 1 creates it, Step 3 adds
  // partners), so this is defensive — but a draft restored from localStorage
  // after a session expiry can arrive here fully populated.
  const warning = hasPartners
    ? await reconcilePartners(supabase, data.id, partner_universities ?? [])
    : undefined

  return { success: true, bipId: data.id, updatedAt: data.updated_at, warning }
}
