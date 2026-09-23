import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Admin activity-log queries (migration 00062).
 *
 * getActivityFeed / getUserActivityFeed / getAdminBipHistoryFeed degrade to
 * empty results for non-admins and on Supabase errors. Actor names resolve
 * through the profiles join; orphan BIP rows (deleted BIPs) surface with a
 * null title instead of dropping.
 */

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import {
  getActivityFeed,
  getUserActivityFeed,
  getAdminBipHistoryFeed,
  resolveActivityCategory,
} from '@/lib/queries/activityLog'

/** Thenable chain stub: every builder method returns the stub itself. */
function stubQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'range', 'limit', 'or']) {
    q[m] = vi.fn(() => q)
  }
  q.then = (resolve: (v: unknown) => void) => resolve(result)
  return q
}

function stubClient(claims: unknown, results: Record<string, unknown>) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        claims ? { data: { claims }, error: null } : { data: null, error: { message: 'no session' } },
      ),
    },
    from: vi.fn((table: string) => stubQuery(results[table])),
  }
}

const ADMIN_CLAIMS = { sub: 'admin-1', app_metadata: { role: 'admin' } }
const COORD_CLAIMS = { sub: 'coord-1', app_metadata: { role: 'coordinator' } }

const ACTIVITY_ROWS = [
  {
    id: 'act-1',
    category: 'coordinator',
    action: 'coordinator_request_filed',
    actor_id: null,
    target_user_id: null,
    target_email: 'jane@uni.edu',
    target_name: 'Jane',
    metadata: {},
    created_at: '2026-09-22T10:00:00Z',
    actor: null,
  },
  {
    id: 'act-2',
    category: 'coordinator',
    action: 'coordinator_request_approved',
    actor_id: 'admin-1',
    target_user_id: null,
    target_email: 'jane@uni.edu',
    target_name: 'Jane',
    metadata: {},
    created_at: '2026-09-22T11:00:00Z',
    actor: { full_name: 'Ada Admin' },
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('resolveActivityCategory', () => {
  it('maps plural tab ids to singular column values', () => {
    expect(resolveActivityCategory('coordinators')).toBe('coordinator')
    expect(resolveActivityCategory('students')).toBe('student')
  })

  it('returns null for unknown tabs so the page never filters on garbage', () => {
    expect(resolveActivityCategory('bips')).toBeNull()
    expect(resolveActivityCategory('')).toBeNull()
  })
})

describe('getActivityFeed', () => {
  it('returns mapped rows + total for admins', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, { activity_log: { data: ACTIVITY_ROWS, error: null, count: 2 } }),
    )
    const res = await getActivityFeed({ category: 'coordinator' })
    expect(res.total).toBe(2)
    expect(res.rows).toHaveLength(2)
    expect(res.rows[0]).toMatchObject({ id: 'act-1', actor_name: null })
    expect(res.rows[1]).toMatchObject({ id: 'act-2', actor_name: 'Ada Admin' })
  })

  it('returns empty for non-admin callers', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { activity_log: { data: ACTIVITY_ROWS, error: null, count: 2 } }),
    )
    await expect(getActivityFeed({ category: 'coordinator' })).resolves.toEqual({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
    })
  })

  it('returns empty on Supabase error', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, { activity_log: { data: null, error: { message: 'boom' }, count: null } }),
    )
    const res = await getActivityFeed({ category: 'student' })
    expect(res).toEqual({ rows: [], total: 0, page: 1, pageSize: 25 })
  })

  it('applies action filter, search, and pagination to the query', async () => {
    const client = stubClient(ADMIN_CLAIMS, {
      activity_log: { data: [], error: null, count: 0 },
    })
    mockCreateClient.mockResolvedValue(client)
    await getActivityFeed({
      category: 'student',
      action: 'account_deleted',
      search: 'jane@uni.edu',
      page: 3,
      pageSize: 10,
    })
    const query = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
      string,
      ReturnType<typeof vi.fn>
    >
    expect(query.eq).toHaveBeenCalledWith('category', 'student')
    expect(query.eq).toHaveBeenCalledWith('action', 'account_deleted')
    expect(query.or).toHaveBeenCalledWith(
      'target_name.ilike.%jane@uni.edu%,target_email.ilike.%jane@uni.edu%',
    )
    expect(query.range).toHaveBeenCalledWith(20, 29)
  })
})

describe('getUserActivityFeed', () => {
  it('returns the user trail for admins', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, { activity_log: { data: [ACTIVITY_ROWS[0]], error: null } }),
    )
    const rows = await getUserActivityFeed('coord-9')
    expect(rows).toHaveLength(1)
    expect(rows[0].target_email).toBe('jane@uni.edu')
  })

  it('returns empty for non-admins and blank ids', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { activity_log: { data: ACTIVITY_ROWS, error: null } }),
    )
    await expect(getUserActivityFeed('coord-9')).resolves.toEqual([])
    await expect(getUserActivityFeed('')).resolves.toEqual([])
  })
})

describe('getAdminBipHistoryFeed', () => {
  const BIP_ROWS = [
    {
      id: 'h-1',
      bip_id: 'bip-1',
      from_status: 'pending',
      to_status: 'approved',
      actor_id: 'admin-1',
      note: null,
      action_kind: 'approve',
      created_at: '2026-09-22T10:00:00Z',
      actor: [{ full_name: 'Ada Admin' }],
      bip: { title: 'Quantum BIP' },
    },
    {
      // Orphan row: BIP hard-deleted, title unresolvable — must survive with null.
      id: 'h-2',
      bip_id: null,
      from_status: 'draft',
      to_status: 'pending',
      actor_id: 'coord-1',
      note: null,
      action_kind: 'submit',
      created_at: '2026-09-21T10:00:00Z',
      actor: null,
      bip: null,
    },
  ]

  it('maps actor/bip joins and keeps orphan rows with null title', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, {
        bip_status_history: { data: BIP_ROWS, error: null, count: 2 },
      }),
    )
    const res = await getAdminBipHistoryFeed(1, 25)
    expect(res.total).toBe(2)
    expect(res.rows[0]).toMatchObject({
      id: 'h-1',
      bip_title: 'Quantum BIP',
      actor_name: 'Ada Admin',
    })
    expect(res.rows[1]).toMatchObject({ id: 'h-2', bip_id: null, bip_title: null })
  })

  it('returns empty for non-admins', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, {
        bip_status_history: { data: BIP_ROWS, error: null, count: 2 },
      }),
    )
    await expect(getAdminBipHistoryFeed()).resolves.toEqual({
      rows: [],
      total: 0,
      page: 1,
      pageSize: 25,
    })
  })
})
