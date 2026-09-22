import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Graceful degradation of the profile-change request queries
 * (migration 00059).
 *
 * Regression: /dashboard/settings rendered with a console error
 * "Could not find the table 'public.coordinator_profile_change_requests'
 * in the schema cache" because the migration had not been applied to the
 * remote database. The page must still render — every query in
 * lib/queries/profileChangeRequests.ts must resolve to an empty result
 * instead of throwing when PostgREST reports a missing table.
 */

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import {
  getMyProfileChangeRequests,
  getAdminProfileChangeRequests,
  getPendingProfileChangeRequestCount,
} from '@/lib/queries/profileChangeRequests'

const SCHEMA_CACHE_ERROR = {
  message:
    "Could not find the table 'public.coordinator_profile_change_requests' in the schema cache",
}

/** Minimal thenable chain stub: every builder method returns the stub itself. */
function stubQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'in']) {
    q[m] = vi.fn(() => q)
  }
  q.then = (resolve: (v: unknown) => void) => resolve(result)
  return q
}

function stubClient(claims: unknown, queryResult: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        claims
          ? { data: { claims }, error: null }
          : { data: null, error: { message: 'no session' } },
      ),
    },
    from: vi.fn(() => stubQuery(queryResult)),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('profileChangeRequests missing-table degradation', () => {
  it('getMyProfileChangeRequests resolves [] when the table is not in the schema cache', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient({ sub: 'user-1' }, { data: null, error: SCHEMA_CACHE_ERROR }),
    )
    await expect(getMyProfileChangeRequests()).resolves.toEqual([])
  })

  it('getAdminProfileChangeRequests resolves [] when the table is not in the schema cache', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(
        { sub: 'admin-1', app_metadata: { role: 'admin' } },
        { data: null, error: SCHEMA_CACHE_ERROR },
      ),
    )
    await expect(getAdminProfileChangeRequests()).resolves.toEqual([])
  })

  it('getPendingProfileChangeRequestCount resolves 0 when the table is not in the schema cache', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(
        { sub: 'admin-1', app_metadata: { role: 'admin' } },
        { count: null, error: SCHEMA_CACHE_ERROR },
      ),
    )
    await expect(getPendingProfileChangeRequestCount()).resolves.toBe(0)
  })

  it('getMyProfileChangeRequests resolves [] when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(stubClient(null, null))
    await expect(getMyProfileChangeRequests()).resolves.toEqual([])
  })
})
