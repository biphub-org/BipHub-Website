import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Mark-as-read for student profile-change notifications (migration 00061).
 *
 * Setting read_at removes the card from /admin/students and decrements the
 * sidebar pill; the audit row stays as history. Admin-only, UUID-validated.
 */

const { mockCreateClient, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { markStudentProfileChangeReadAction } from '@/lib/actions/student-profile-changes'

const CHANGE_ID = '123e4567-e89b-12d3-a456-426614174000'

function stubClient(role: string | null, updateResult: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        role
          ? { data: { claims: { sub: 'admin-1', app_metadata: { role } } }, error: null }
          : { data: null, error: { message: 'no session' } },
      ),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn().mockResolvedValue(updateResult),
        })),
      })),
    })),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('markStudentProfileChangeReadAction', () => {
  it('sets read_at for admins and revalidates /admin/students', async () => {
    const client = stubClient('admin', { error: null })
    mockCreateClient.mockResolvedValue(client)

    const result = await markStudentProfileChangeReadAction(CHANGE_ID)

    expect(result).toEqual({ success: true })
    const update = client.from.mock.results[0].value.update as ReturnType<
      typeof vi.fn
    >
    expect(update).toHaveBeenCalledWith({ read_at: expect.any(String) })
    const eq = update.mock.results[0].value.eq as ReturnType<typeof vi.fn>
    expect(eq).toHaveBeenCalledWith('id', CHANGE_ID)
    const is = eq.mock.results[0].value.is as ReturnType<typeof vi.fn>
    expect(is).toHaveBeenCalledWith('read_at', null)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/students')
  })

  it('rejects non-UUID ids without touching the database', async () => {
    const client = stubClient('admin', { error: null })
    mockCreateClient.mockResolvedValue(client)

    const result = await markStudentProfileChangeReadAction('not-a-uuid')

    expect(result.error).toBeDefined()
    expect(client.from).not.toHaveBeenCalled()
  })

  it('rejects non-admin callers', async () => {
    const client = stubClient('student', { error: null })
    mockCreateClient.mockResolvedValue(client)

    const result = await markStudentProfileChangeReadAction(CHANGE_ID)

    expect(result).toEqual({ error: 'Not allowed.' })
    expect(client.from).not.toHaveBeenCalled()
  })

  it('returns an error when the update fails', async () => {
    mockCreateClient.mockResolvedValue(
      stubClient('admin', { error: { message: 'denied' } }),
    )

    const result = await markStudentProfileChangeReadAction(CHANGE_ID)

    expect(result.error).toBeDefined()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
