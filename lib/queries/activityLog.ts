/**
 * Admin activity-log queries (migration 00062 `activity_log`).
 *
 * People-activity audit: account created/deleted, access requests + decisions,
 * profile/profile-change activity, alert subscriptions. BIP lifecycle stays
 * in bip_status_history (see lib/queries/statusHistory.ts).
 *
 * Authorization: RLS `activity_log_select_admin` restricts reads to admins;
 * getClaims() is invoked here per convention so callers degrade gracefully
 * instead of leaking Supabase errors. No UPDATE/DELETE exists — history is
 * immutable; listing cards (BIPs, users) are deleted from the dashboards,
 * never here.
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key) — NEVER createAdminClient (out of scope).
 */
import { createClient } from '@/lib/supabase/server'

export type ActivityCategory = 'coordinator' | 'student' | 'admin'

export type ActivityRow = {
  id: string
  category: string
  action: string
  actor_id: string | null
  actor_name: string | null
  target_user_id: string | null
  target_email: string | null
  target_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type ActivityFeedResult = {
  rows: ActivityRow[]
  total: number
  page: number
  pageSize: number
}

/**
 * Map an admin-history tab id to its `activity_log.category` value.
 *
 * Tab ids are plural for readability ("Coordinators"); the column stores the
 * singular `profiles.role` value. Passing the tab id straight into the
 * `.eq('category', …)` filter matches zero rows — this mapper is the only
 * legal conversion (returns null for unknown tabs, including 'bips').
 */
export function resolveActivityCategory(tab: string): ActivityCategory | null {
  if (tab === 'coordinators') return 'coordinator'
  if (tab === 'students') return 'student'
  return null
}

export type ActivityFeedParams = {
  category: ActivityCategory
  /** Exact action match (e.g. 'account_deleted'). Omitted = all actions. */
  action?: string
  /** Matches target_name / target_email (case-insensitive contains). */
  search?: string
  page?: number
  pageSize?: number
}

type ActivityJoinRow = {
  id: string
  category: string
  action: string
  actor_id: string | null
  target_user_id: string | null
  target_email: string | null
  target_name: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor: { full_name: string | null } | Array<{ full_name: string | null }> | null
}

const ACTIVITY_SELECT =
  'id, category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at, actor:profiles!activity_log_actor_id_fkey ( full_name )'

function toActivityRow(row: ActivityJoinRow): ActivityRow {
  const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor
  return {
    id: row.id,
    category: row.category,
    action: row.action,
    actor_id: row.actor_id,
    actor_name: actor?.full_name ?? null,
    target_user_id: row.target_user_id,
    target_email: row.target_email,
    target_name: row.target_name,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  }
}

async function requireAdminId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null
  return data.claims.sub
}

/**
 * Paginated admin feed for one history category. Newest first.
 */
export async function getActivityFeed(params: ActivityFeedParams): Promise<ActivityFeedResult> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const adminId = await requireAdminId()
  if (!adminId) return { rows: [], total: 0, page, pageSize }

  const supabase = await createClient()
  let query = supabase
    .from('activity_log')
    .select(ACTIVITY_SELECT, { count: 'exact' })
    .eq('category', params.category)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.action) {
    query = query.eq('action', params.action)
  }
  const search = params.search?.trim()
  if (search) {
    // PostgREST OR-escaping: commas would split expressions — strip them.
    const q = search.replace(/,/g, ' ').replace(/%/g, '')
    query = query.or(`target_name.ilike.%${q}%,target_email.ilike.%${q}%`)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[getActivityFeed] supabase error:', error.message)
    return { rows: [], total: 0, page, pageSize }
  }
  return {
    rows: ((data ?? []) as unknown as ActivityJoinRow[]).map(toActivityRow),
    total: count ?? 0,
    page,
    pageSize,
  }
}

/**
 * Single-user activity trail (admin user-detail pages): every row where the
 * user is actor or target, newest first.
 */
export async function getUserActivityFeed(
  targetUserId: string,
  limit = 100,
): Promise<ActivityRow[]> {
  if (!targetUserId) return []
  const adminId = await requireAdminId()
  if (!adminId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select(ACTIVITY_SELECT)
    .or(`target_user_id.eq.${targetUserId},actor_id.eq.${targetUserId}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getUserActivityFeed] supabase error:', error.message)
    return []
  }
  return ((data ?? []) as unknown as ActivityJoinRow[]).map(toActivityRow)
}

/**
 * Paginated admin BIP-history feed (bip_status_history across all BIPs,
 * including orphan rows from deleted BIPs). Newest first.
 */
export type AdminBipHistoryRow = {
  id: string
  bip_id: string | null
  bip_title: string | null
  from_status: string | null
  to_status: string
  actor_id: string | null
  actor_name: string | null
  note: string | null
  action_kind: string
  created_at: string
}

export async function getAdminBipHistoryFeed(
  page = 1,
  pageSize = 25,
  actionKind?: string,
): Promise<{ rows: AdminBipHistoryRow[]; total: number; page: number; pageSize: number }> {
  const safePage = Math.max(1, page)
  const safeSize = Math.min(100, Math.max(1, pageSize))
  const from = (safePage - 1) * safeSize
  const to = from + safeSize - 1

  const adminId = await requireAdminId()
  if (!adminId) return { rows: [], total: 0, page: safePage, pageSize: safeSize }

  const supabase = await createClient()
  let query = supabase
    .from('bip_status_history')
    .select(
      'id, bip_id, from_status, to_status, actor_id, note, action_kind, created_at, actor:profiles!bip_status_history_actor_id_fkey ( full_name ), bip:bips!bip_status_history_bip_id_fkey ( title )',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (actionKind) {
    query = query.eq('action_kind', actionKind)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[getAdminBipHistoryFeed] supabase error:', error.message)
    return { rows: [], total: 0, page: safePage, pageSize: safeSize }
  }
  type Row = {
    id: string
    bip_id: string | null
    from_status: string | null
    to_status: string
    actor_id: string | null
    note: string | null
    action_kind: string
    created_at: string
    actor: { full_name: string | null } | Array<{ full_name: string | null }> | null
    bip: { title: string | null } | Array<{ title: string | null }> | null
  }
  return {
    rows: ((data ?? []) as unknown as Row[]).map((row) => {
      const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor
      const bip = Array.isArray(row.bip) ? (row.bip[0] ?? null) : row.bip
      return {
        id: row.id,
        bip_id: row.bip_id,
        bip_title: bip?.title ?? null,
        from_status: row.from_status,
        to_status: row.to_status,
        actor_id: row.actor_id,
        actor_name: actor?.full_name ?? null,
        note: row.note,
        action_kind: row.action_kind,
        created_at: row.created_at,
      }
    }),
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  }
}
