import { describe, expect, it, vi } from 'vitest'
import { resolveHostUniversityId } from '@/lib/utils/host-university'

/**
 * Minimal PostgREST-style chain mock: supports
 * `.from().select().eq().maybeSingle()` and
 * `.from().select().order().limit().maybeSingle()`.
 */
function mockClient({
  profile,
  fallback,
}: {
  profile: { university_id: string | null } | null
  fallback: { id: string } | null
}) {
  const maybeSingle = vi.fn()
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle,
  }
  for (const key of ['select', 'eq', 'order', 'limit']) {
    chain[key].mockReturnValue(chain)
  }
  const from = vi.fn((table: string) => {
    maybeSingle.mockResolvedValueOnce({
      data: table === 'profiles' ? profile : fallback,
    })
    return chain
  })
  return { from } as unknown as Parameters<
    typeof resolveHostUniversityId
  >[0]
}

describe('resolveHostUniversityId', () => {
  it('returns the profile university for a coordinator', async () => {
    const client = mockClient({
      profile: { university_id: 'uni-1' },
      fallback: { id: 'uni-9' },
    })
    await expect(
      resolveHostUniversityId(client, 'user-1', 'coordinator'),
    ).resolves.toBe('uni-1')
    // Fallback universities must not even be queried when the profile has one.
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('returns the profile university for an admin who has one', async () => {
    const client = mockClient({
      profile: { university_id: 'uni-1' },
      fallback: { id: 'uni-9' },
    })
    await expect(
      resolveHostUniversityId(client, 'admin-1', 'admin'),
    ).resolves.toBe('uni-1')
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('returns null for a coordinator without a profile university', async () => {
    const client = mockClient({
      profile: { university_id: null },
      fallback: { id: 'uni-9' },
    })
    await expect(
      resolveHostUniversityId(client, 'user-1', 'coordinator'),
    ).resolves.toBeNull()
    // Coordinators never get the admin fallback.
    expect(client.from).toHaveBeenCalledTimes(1)
  })

  it('falls back to the first university for an admin without one', async () => {
    const client = mockClient({
      profile: { university_id: null },
      fallback: { id: 'uni-9' },
    })
    await expect(
      resolveHostUniversityId(client, 'admin-1', 'admin'),
    ).resolves.toBe('uni-9')
    expect(client.from).toHaveBeenCalledTimes(2)
  })

  it('returns null for an admin when no universities exist', async () => {
    const client = mockClient({
      profile: null,
      fallback: null,
    })
    await expect(
      resolveHostUniversityId(client, 'admin-1', 'admin'),
    ).resolves.toBeNull()
  })
})
