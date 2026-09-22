import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Student profile-change audit queries (migration 00060).
 *
 * The admin dashboard surfaces student edits via the audit table:
 * latest rows for the /admin/students section, 7-day count for the
 * sidebar pill. Both degrade to empty results on error (table missing,
 * RLS denial) instead of breaking admin chrome.
 */

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import {
  getRecentStudentProfileChanges,
  getRecentStudentProfileChangeCount,
} from '@/lib/queries/studentProfileChanges'

/** Thenable chain stub: every builder method returns the stub itself. */
function stubQuery(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'gte', 'is']) {
    q[m] = vi.fn(() => q)
  }
  q.then = (resolve: (v: unknown) => void) => resolve(result)
  return q
}

function stubClient(claims: unknown, results: Record<string, unknown>) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        claims
          ? { data: { claims }, error: null }
          : { data: null, error: { message: 'no session' } },
      ),
    },
    from: vi.fn((table: string) => stubQuery(results[table])),
  }
}

const ADMIN_CLAIMS = { sub: 'admin-1', app_metadata: { role: 'admin' } }

const CHANGE_ROWS = [
  {
    id: 'chg-1',
    student_id: 'student-1',
    changes: [{ label: 'Full name', before: 'Old', after: 'New' }],
    created_at: '2026-09-22T10:00:00Z',
  },
]

const PROFILE_ROWS = [
  { id: 'student-1', full_name: 'New', contact_email: 's@uni.edu' },
]

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getRecentStudentProfileChanges', () => {
  it('joins student identity onto change rows', async () => {
    const client = stubClient(ADMIN_CLAIMS, {
      student_profile_changes: { data: CHANGE_ROWS, error: null },
      profiles: { data: PROFILE_ROWS, error: null },
    })
    mockCreateClient.mockResolvedValue(client)

    await expect(getRecentStudentProfileChanges()).resolves.toEqual([
      {
        id: 'chg-1',
        studentId: 'student-1',
        studentName: 'New',
        studentEmail: 's@uni.edu',
        changes: [{ label: 'Full name', before: 'Old', after: 'New' }],
        createdAt: '2026-09-22T10:00:00Z',
      },
    ])
  })

  it('only fetches unread rows (marking read removes the notification)', async () => {
    const client = stubClient(ADMIN_CLAIMS, {
      student_profile_changes: { data: [], error: null },
    })
    mockCreateClient.mockResolvedValue(client)

    await getRecentStudentProfileChanges()

    const q = client.from.mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    expect(q.is).toHaveBeenCalledWith('read_at', null)
  })

  it('resolves [] when the audit table is missing', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, {
        student_profile_changes: {
          data: null,
          error: {
            message:
              "Could not find the table 'public.student_profile_changes' in the schema cache",
          },
        },
      }),
    )

    await expect(getRecentStudentProfileChanges()).resolves.toEqual([])
  })

  it('resolves [] for non-admin callers', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient({ sub: 'student-1' }, {}),
    )

    await expect(getRecentStudentProfileChanges()).resolves.toEqual([])
  })
})

describe('getRecentStudentProfileChangeCount', () => {
  it('returns the exact unread count', async () => {
    const client = stubClient(ADMIN_CLAIMS, {
      student_profile_changes: { count: 3, error: null },
    })
    mockCreateClient.mockResolvedValue(client)

    await expect(getRecentStudentProfileChangeCount()).resolves.toBe(3)
    const q = client.from.mock.results[0].value as Record<string, ReturnType<typeof vi.fn>>
    expect(q.is).toHaveBeenCalledWith('read_at', null)
  })

  it('returns 0 on error and for non-admin callers', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient(ADMIN_CLAIMS, {
        student_profile_changes: { count: null, error: { message: 'boom' } },
      }),
    )
    await expect(getRecentStudentProfileChangeCount()).resolves.toBe(0)

    mockCreateClient.mockResolvedValue(stubClient({ sub: 's' }, {}))
    await expect(getRecentStudentProfileChangeCount()).resolves.toBe(0)
  })
})
