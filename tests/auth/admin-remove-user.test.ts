import { describe, it, expect } from 'vitest'
import { canAdminRemoveUser } from '@/lib/auth/admin-remove-user'

const CALLER = '11111111-1111-1111-1111-111111111111'
const TARGET = '22222222-2222-2222-2222-222222222222'

describe('canAdminRemoveUser', () => {
  it('allows removing a student', () => {
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: TARGET, role: 'student' } }),
    ).toBeNull()
  })

  it('allows removing a coordinator', () => {
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: TARGET, role: 'coordinator' } }),
    ).toBeNull()
  })

  it('rejects a missing target', () => {
    expect(canAdminRemoveUser({ callerId: CALLER, target: null })).toBe('User not found.')
  })

  it('rejects self-removal', () => {
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: CALLER, role: 'admin' } }),
    ).toMatch(/own admin account/)
  })

  it('rejects removing another admin', () => {
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: TARGET, role: 'admin' } }),
    ).toBe('Only student and coordinator accounts can be removed.')
  })

  it('rejects unknown roles', () => {
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: TARGET, role: 'ghost' } }),
    ).toBe('Only student and coordinator accounts can be removed.')
    expect(
      canAdminRemoveUser({ callerId: CALLER, target: { id: TARGET, role: null } }),
    ).toBe('Only student and coordinator accounts can be removed.')
  })
})
