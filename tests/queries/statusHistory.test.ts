import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Coordinator history queries (bip_status_history timeline + feed).
 *
 * getBipTimeline returns every row oldest-first with actor names resolved
 * through the profiles join (null when RLS hides the actor — the UI renders
 * "BipHub team"). getCoordinatorHistoryFeed adds the BIP title/slug for
 * grouping. Both degrade to [] without a session or on Supabase errors.
 */

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import { getBipTimeline, getCoordinatorHistoryFeed } from '@/lib/queries/statusHistory'

function stubQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'gte', 'lte']) {
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

const COORD_CLAIMS = { sub: 'coord-1', app_metadata: { role: 'coordinator' } }

const TIMELINE_ROWS = [
  {
    id: 'h-1',
    bip_id: 'bip-1',
    from_status: null,
    to_status: 'pending',
    actor_id: 'coord-1',
    note: null,
    action_kind: 'submit',
    created_at: '2026-09-20T10:00:00Z',
    actor: { full_name: 'Coord Name' },
  },
  {
    id: 'h-2',
    bip_id: 'bip-1',
    from_status: 'pending',
    to_status: 'rejected',
    actor_id: 'admin-1',
    note: 'Needs more detail.',
    action_kind: 'reject',
    created_at: '2026-09-21T10:00:00Z',
    // Admin profile hidden from coordinators by RLS → null actor.
    actor: null,
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getBipTimeline', () => {
  it('maps rows with actor names and preserves admin notes', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { bip_status_history: { data: TIMELINE_ROWS, error: null } }),
    )
    const rows = await getBipTimeline('bip-1')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ id: 'h-1', actor_name: 'Coord Name' })
    expect(rows[1]).toMatchObject({
      id: 'h-2',
      actor_name: null,
      note: 'Needs more detail.',
      action_kind: 'reject',
    })
  })

  it('returns [] without a session, with a blank id, or on error', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(null, { bip_status_history: { data: TIMELINE_ROWS, error: null } }),
    )
    await expect(getBipTimeline('bip-1')).resolves.toEqual([])
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { bip_status_history: { data: TIMELINE_ROWS, error: null } }),
    )
    await expect(getBipTimeline('')).resolves.toEqual([])
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { bip_status_history: { data: null, error: { message: 'boom' } } }),
    )
    await expect(getBipTimeline('bip-1')).resolves.toEqual([])
  })
})

describe('getCoordinatorHistoryFeed', () => {
  it('attaches BIP title/slug to each row', async () => {
    const rows = [
      { ...TIMELINE_ROWS[1], bip: { title: 'Quantum BIP', slug: 'quantum-bip' } },
    ]
    mockCreateClient.mockResolvedValue(
      stubClient(COORD_CLAIMS, { bip_status_history: { data: rows, error: null } }),
    )
    const feed = await getCoordinatorHistoryFeed()
    expect(feed).toHaveLength(1)
    expect(feed[0]).toMatchObject({
      id: 'h-2',
      bip_title: 'Quantum BIP',
      bip_slug: 'quantum-bip',
    })
  })

  it('returns [] without a session', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(null, { bip_status_history: { data: [], error: null } }),
    )
    await expect(getCoordinatorHistoryFeed()).resolves.toEqual([])
  })

  it('applies BIP, action, and date filters to the query', async () => {
    const client = stubClient(COORD_CLAIMS, {
      bip_status_history: { data: [], error: null },
    })
    mockCreateClient.mockResolvedValue(client)
    await getCoordinatorHistoryFeed({
      bipId: 'bip-1',
      actionKind: 'reject',
      from: '2026-09-01',
      to: '2026-09-30',
    })
    const query = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
      string,
      ReturnType<typeof vi.fn>
    >
    expect(query.eq).toHaveBeenCalledWith('bip_id', 'bip-1')
    expect(query.eq).toHaveBeenCalledWith('action_kind', 'reject')
    expect(query.gte).toHaveBeenCalledWith('created_at', '2026-09-01T00:00:00')
    expect(query.lte).toHaveBeenCalledWith('created_at', '2026-09-30T23:59:59')
  })

  it('omits filters when unprovided', async () => {
    const client = stubClient(COORD_CLAIMS, {
      bip_status_history: { data: [], error: null },
    })
    mockCreateClient.mockResolvedValue(client)
    await getCoordinatorHistoryFeed()
    const query = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value as Record<
      string,
      ReturnType<typeof vi.fn>
    >
    expect(query.eq).not.toHaveBeenCalled()
    expect(query.gte).not.toHaveBeenCalled()
    expect(query.lte).not.toHaveBeenCalled()
  })
})
