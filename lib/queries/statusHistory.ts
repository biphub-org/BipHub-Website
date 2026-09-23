/**
 * Status history queries (Phase 3 — D-09).
 *
 * Reads bip_status_history rows. RLS policy bsh_select_own_or_admin
 * (migration 00010) enforces:
 *   - admins: see all rows
 *   - coordinators: see rows where bip_id matches a BIP they own
 *
 * Defense-in-depth: getClaims() is invoked here even though RLS is the
 * primary authorization layer — the auth check returns null on session
 * failure so callers degrade gracefully instead of leaking generic
 * Supabase errors.
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key) — NEVER createAdminClient (out of scope).
 */
import { createClient } from '@/lib/supabase/server'

export type LatestRejection = { reason: string | null; created_at: string } | null

/**
 * Latest rejection (most recent to_status='rejected' row) for a single BIP.
 *
 * Returns null if there is no rejection in the audit history, or if the
 * caller's session is invalid. The `note` column carries the admin's
 * verbatim reason (action_kind='reject' written by rejectBipAction).
 */
export async function getLatestRejection(bipId: string): Promise<LatestRejection> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) return null

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('note, created_at')
    .eq('bip_id', bipId)
    .eq('to_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestRejection] supabase error:', error.message)
    return null
  }
  return data ? { reason: data.note, created_at: data.created_at } : null
}

/**
 * Batched version for the coordinator dashboard. Returns a map of
 * bipId → latest rejection reason. Fetches all matching history rows
 * for the given bipIds in one query and reduces in JS (avoids N+1).
 * Coordinator RLS already scopes to their own BIPs.
 *
 * The rows are pre-sorted desc by created_at, so the first hit per
 * bip_id in the reduce wins (most recent rejection).
 */
export async function getLatestRejectionsByBipIds(
  bipIds: string[],
): Promise<Map<string, string>> {
  if (bipIds.length === 0) return new Map()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('bip_id, note, created_at')
    .eq('to_status', 'rejected')
    .in('bip_id', bipIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getLatestRejectionsByBipIds] supabase error:', error.message)
    return new Map()
  }

  const out = new Map<string, string>()
  for (const row of data ?? []) {
    if (!row.bip_id || !row.note) continue
    if (out.has(row.bip_id)) continue // first row per bip_id wins (already sorted desc)
    out.set(row.bip_id, row.note)
  }
  return out
}

/**
 * Full per-BIP timeline (coordinator history view + admin review).
 *
 * Returns EVERY audit row for the BIP, oldest first -- submit, approvals,
 * rejections (with the admin note), change requests, edits, withdraws.
 * RLS (bsh_select_own_or_admin) scopes coordinators to their own BIPs and
 * lets admins read everything, including orphan rows (bip_id NULL after a
 * BIP hard-delete -- visible to admins only, since the coordinator RLS
 * branch requires a live owned bips row).
 *
 * Actor names resolve via the profiles join when the caller may read them
 * (admins, or the coordinator's own actions). Rows acted on by someone
 * else come back with actor_name NULL -- callers render "BipHub team".
 */
export type BipHistoryRow = {
  id: string
  bip_id: string | null
  from_status: string | null
  to_status: string
  actor_id: string | null
  actor_name: string | null
  note: string | null
  action_kind: string
  created_at: string
}

type HistoryJoinRow = {
  id: string
  bip_id: string | null
  from_status: string | null
  to_status: string
  actor_id: string | null
  note: string | null
  action_kind: string
  created_at: string
  actor:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null
}

function toHistoryRow(row: HistoryJoinRow): BipHistoryRow {
  const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor
  return {
    id: row.id,
    bip_id: row.bip_id,
    from_status: row.from_status,
    to_status: row.to_status,
    actor_id: row.actor_id,
    actor_name: actor?.full_name ?? null,
    note: row.note,
    action_kind: row.action_kind,
    created_at: row.created_at,
  }
}

const TIMELINE_SELECT =
  'id, bip_id, from_status, to_status, actor_id, note, action_kind, created_at, actor:profiles!bip_status_history_actor_id_fkey ( full_name )'

export type HistoryDateRange = {
  /** Inclusive start, plain calendar date (YYYY-MM-DD). */
  from?: string
  /** Inclusive end, plain calendar date (YYYY-MM-DD). */
  to?: string
}

/** Apply an optional calendar-date window to a history query. */
function applyDateRange<
  T extends { gte: (col: string, v: string) => T; lte: (col: string, v: string) => T },
>(query: T, range: HistoryDateRange): T {
  let q = query
  if (range.from) {
    q = q.gte('created_at', `${range.from}T00:00:00`)
  }
  if (range.to) {
    q = q.lte('created_at', `${range.to}T23:59:59`)
  }
  return q
}

export async function getBipTimeline(
  bipId: string,
  filter: { actionKind?: string } & HistoryDateRange = {},
): Promise<BipHistoryRow[]> {
  if (!bipId) return []
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) return []

  let query = supabase.from('bip_status_history').select(TIMELINE_SELECT).eq('bip_id', bipId)
  if (filter.actionKind) {
    query = query.eq('action_kind', filter.actionKind)
  }
  const { data, error } = await applyDateRange(query, filter).order('created_at', {
    ascending: true,
  })

  if (error) {
    console.error('[getBipTimeline] supabase error:', error.message)
    return []
  }
  return ((data ?? []) as unknown as HistoryJoinRow[]).map(toHistoryRow)
}

/**
 * Cross-BIP feed for the coordinator history page: every audit row on BIPs
 * the caller owns, newest first, with the BIP title/slug for grouping.
 * RLS scopes to owned BIPs; orphan rows (deleted BIPs) are admin-visible
 * only (see getBipTimeline note).
 */
export type CoordinatorFeedRow = BipHistoryRow & {
  bip_title: string | null
  bip_slug: string | null
}

export type CoordinatorHistoryFeedFilter = {
  limit?: number
  /** Single BIP id. Omitted = all owned BIPs. */
  bipId?: string
  /** Exact action_kind match. Omitted = all actions. */
  actionKind?: string
} & HistoryDateRange

export async function getCoordinatorHistoryFeed(
  filter: CoordinatorHistoryFeedFilter = {},
): Promise<CoordinatorFeedRow[]> {
  const { limit = 200, bipId, actionKind } = filter
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) return []

  let query = supabase
    .from('bip_status_history')
    .select(`${TIMELINE_SELECT}, bip:bips!bip_status_history_bip_id_fkey ( title, slug )`)
  if (bipId) {
    query = query.eq('bip_id', bipId)
  }
  if (actionKind) {
    query = query.eq('action_kind', actionKind)
  }
  const { data, error } = await applyDateRange(query, filter)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getCoordinatorHistoryFeed] supabase error:', error.message)
    return []
  }
  type FeedJoinRow = HistoryJoinRow & {
    bip:
      | { title: string | null; slug: string | null }
      | Array<{ title: string | null; slug: string | null }>
      | null
  }
  return ((data ?? []) as unknown as FeedJoinRow[]).map((row) => {
    const bip = Array.isArray(row.bip) ? (row.bip[0] ?? null) : row.bip
    return {
      ...toHistoryRow(row),
      bip_title: bip?.title ?? null,
      bip_slug: bip?.slug ?? null,
    }
  })
}
