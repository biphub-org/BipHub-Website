import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Admin notification + student receipt on student profile edits (dashboard).
 *
 * When a student changes their profile data, ADMIN_NOTIFICATION_EMAIL
 * receives a before → after diff AND the student receives a
 * student-profile-updated receipt at their login email. Saving untouched
 * values sends nothing, and a first-time save (no prior row = creation,
 * not a change) sends nothing either.
 */

const { mockCreateClient, mockSendEmail, mockRevalidatePath, mockAuditInsert } =
  vi.hoisted(() => ({
    mockCreateClient: vi.fn(),
    mockSendEmail: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockAuditInsert: vi.fn(),
  }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: mockSendEmail,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { updateStudentProfileAction } from '@/lib/actions/profile'

const UNI_ID_OLD = '11111111-1111-4111-8111-111111111111'
const UNI_ID_NEW = '22222222-2222-4222-8222-222222222222'

const BEFORE_ROW = {
  full_name: 'Old Name',
  country: 'DE',
  university_id: UNI_ID_OLD,
  university: { name: 'Old University' },
}

/** Supabase stub: profiles (before snapshot + upsert), universities lookups. */
function stubClient(beforeRow: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue({
        data: { claims: { sub: 'student-1', email: 'student@uni.edu' } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'student_profile_changes') {
        return { insert: mockAuditInsert }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: beforeRow, error: null }),
            })),
          })),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      // universities: existence check (id) + after-name lookup (name)
      return {
        select: vi.fn((cols: string) => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: cols.includes('name')
                ? { id: UNI_ID_NEW, name: 'New University' }
                : { id: UNI_ID_NEW },
              error: null,
            }),
          })),
        })),
      }
    }),
  }
}

function profileForm(
  overrides: Partial<
    Record<'full_name' | 'country' | 'university_id', string>
  > = {},
): FormData {
  const fd = new FormData()
  fd.set('full_name', overrides.full_name ?? 'Old Name')
  fd.set('country', overrides.country ?? 'DE')
  fd.set('university_id', overrides.university_id ?? UNI_ID_OLD)
  return fd
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@biphub.eu')
  mockSendEmail.mockResolvedValue(undefined)
  mockAuditInsert.mockResolvedValue({ error: null })
})

describe('updateStudentProfileAction admin email', () => {
  it('sends before → after for changed name, country and university', async () => {
    mockCreateClient.mockResolvedValue(stubClient(BEFORE_ROW))

    const result = await updateStudentProfileAction(
      profileForm({
        full_name: 'New Name',
        country: 'FR',
        university_id: UNI_ID_NEW,
      }),
    )

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
    const [recipient, payload] = mockSendEmail.mock.calls[0] as [
      string,
      { template: string; props: Record<string, unknown> },
    ]
    expect(recipient).toBe('admin@biphub.eu')
    expect(payload.template).toBe('student-profile-changed-admin')
    const changes = payload.props.changes as Array<{
      label: string
      before: string
      after: string
    }>
    expect(changes).toContainEqual({
      label: 'Full name',
      before: 'Old Name',
      after: 'New Name',
    })
    expect(changes).toContainEqual({
      label: 'Country',
      before: 'Germany',
      after: 'France',
    })
    expect(changes).toContainEqual({
      label: 'University',
      before: 'Old University',
      after: 'New University',
    })

    // Second send: the student receipt at the login email.
    const [studentRecipient, studentPayload] = mockSendEmail.mock.calls[1] as [
      string,
      { template: string; props: Record<string, unknown> },
    ]
    expect(studentRecipient).toBe('student@uni.edu')
    expect(studentPayload.template).toBe('student-profile-updated')
    expect(studentPayload.props.fullName).toBe('New Name')
  })

  it('sends nothing when values are unchanged', async () => {
    mockCreateClient.mockResolvedValue(stubClient(BEFORE_ROW))

    const result = await updateStudentProfileAction(profileForm())

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('writes an audit row with the diff when values change', async () => {
    mockCreateClient.mockResolvedValue(stubClient(BEFORE_ROW))

    await updateStudentProfileAction(
      profileForm({ full_name: 'New Name', university_id: UNI_ID_NEW }),
    )

    expect(mockAuditInsert).toHaveBeenCalledOnce()
    expect(mockAuditInsert).toHaveBeenCalledWith({
      student_id: 'student-1',
      changes: expect.arrayContaining([
        { label: 'Full name', before: 'Old Name', after: 'New Name' },
        {
          label: 'University',
          before: 'Old University',
          after: 'New University',
        },
      ]),
    })
  })

  it('writes no audit row when values are unchanged', async () => {
    mockCreateClient.mockResolvedValue(stubClient(BEFORE_ROW))

    await updateStudentProfileAction(profileForm())

    expect(mockAuditInsert).not.toHaveBeenCalled()
  })

  it('sends nothing on first-time save (no prior row)', async () => {
    mockCreateClient.mockResolvedValue(stubClient(null))

    const result = await updateStudentProfileAction(
      profileForm({ full_name: 'Brand New' }),
    )

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})
