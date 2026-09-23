import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Admin cleanup deletes for decided inbox rows.
 *
 * Decided access requests and data-change requests can be deleted to keep
 * the inboxes organized; the audit trail survives in activity_log. The
 * decided-only guard is the safety contract: pending rows are the live
 * queue and must go through Reject/Decline (which notifies the person),
 * never silent deletion.
 */

const { mockCreateClient, mockCreateAdminClient, mockRevalidatePath } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mockCreateAdminClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { deleteCoordinatorRequestAction } from '@/app/(admin)/admin/coordinators/requests/actions'
import { deleteProfileChangeRequestAction } from '@/app/(admin)/admin/coordinators/data-changes/actions'

const ADMIN_CLAIMS = { sub: 'admin-1', app_metadata: { role: 'admin' } }
const COORD_CLAIMS = { sub: 'coord-1', app_metadata: { role: 'coordinator' } }

function stubAnonClient(claims: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        claims ? { data: { claims }, error: null } : { data: null, error: { message: 'no session' } },
      ),
    },
  }
}

/** Admin-client stub: select-chain reads one row, delete-chain resolves an error (or null). */
function stubAdminClient(row: unknown, fetchError: unknown, deleteError: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: fetchError })
  const eqSelect = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq: eqSelect }))
  const eqDelete = vi.fn().mockResolvedValue({ error: deleteError })
  const del = vi.fn(() => ({ eq: eqDelete }))
  const from = vi.fn(() => ({ select, delete: del }))
  return { from, eqSelect, eqDelete }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('deleteCoordinatorRequestAction', () => {
  it('deletes a decided request and revalidates the inbox', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    const admin = stubAdminClient({ id: 'req-1', status: 'rejected' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)

    await expect(deleteCoordinatorRequestAction('req-1')).resolves.toEqual({ success: true })
    expect(admin.eqDelete).toHaveBeenCalledWith('id', 'req-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/coordinators/requests')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/coordinators')
  })

  it('refuses pending rows so the live queue cannot be silently cleared', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    const admin = stubAdminClient({ id: 'req-1', status: 'pending' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)

    await expect(deleteCoordinatorRequestAction('req-1')).resolves.toEqual({
      error: expect.stringContaining('Only decided requests'),
    })
    expect(admin.eqDelete).not.toHaveBeenCalled()
  })

  it('rejects non-admins, missing ids, and unknown rows', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(COORD_CLAIMS))
    const admin = stubAdminClient({ id: 'req-1', status: 'rejected' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)
    await expect(deleteCoordinatorRequestAction('req-1')).resolves.toEqual({ error: 'Forbidden.' })

    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    await expect(deleteCoordinatorRequestAction('')).resolves.toEqual({ error: 'Missing request.' })

    const missing = stubAdminClient(null, { message: 'not found' }, null)
    mockCreateAdminClient.mockReturnValue(missing)
    await expect(deleteCoordinatorRequestAction('nope')).resolves.toEqual({
      error: 'Request not found.',
    })
    expect(missing.eqDelete).not.toHaveBeenCalled()
  })

  it('surfaces DB delete failures', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    mockCreateAdminClient.mockReturnValue(
      stubAdminClient({ id: 'req-1', status: 'approved' }, null, { message: 'db down' }),
    )
    await expect(deleteCoordinatorRequestAction('req-1')).resolves.toEqual({
      error: 'Failed to delete the request. Please try again.',
    })
  })
})

describe('deleteProfileChangeRequestAction', () => {
  it('deletes a decided request and revalidates the inbox', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    const admin = stubAdminClient({ id: 'chg-1', status: 'declined' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)

    await expect(deleteProfileChangeRequestAction('chg-1')).resolves.toEqual({ success: true })
    expect(admin.eqDelete).toHaveBeenCalledWith('id', 'chg-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/coordinators/data-changes')
  })

  it('refuses pending rows so the live queue cannot be silently cleared', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    const admin = stubAdminClient({ id: 'chg-1', status: 'pending' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)

    await expect(deleteProfileChangeRequestAction('chg-1')).resolves.toEqual({
      error: expect.stringContaining('Only decided requests'),
    })
    expect(admin.eqDelete).not.toHaveBeenCalled()
  })

  it('rejects non-admins, missing ids, and unknown rows', async () => {
    mockCreateClient.mockResolvedValue(stubAnonClient(COORD_CLAIMS))
    const admin = stubAdminClient({ id: 'chg-1', status: 'approved' }, null, null)
    mockCreateAdminClient.mockReturnValue(admin)
    await expect(deleteProfileChangeRequestAction('chg-1')).resolves.toEqual({
      error: 'Forbidden.',
    })

    mockCreateClient.mockResolvedValue(stubAnonClient(ADMIN_CLAIMS))
    await expect(deleteProfileChangeRequestAction('')).resolves.toEqual({
      error: 'Missing request.',
    })

    const missing = stubAdminClient(null, { message: 'not found' }, null)
    mockCreateAdminClient.mockReturnValue(missing)
    await expect(deleteProfileChangeRequestAction('nope')).resolves.toEqual({
      error: 'Request not found.',
    })
    expect(missing.eqDelete).not.toHaveBeenCalled()
  })
})
