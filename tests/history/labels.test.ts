import { describe, it, expect } from 'vitest'
import { bipActionLabel, activityActionLabel, activityCategoryLabel } from '@/lib/history/labels'

describe('history labels', () => {
  it('maps every BIP action_kind to human copy', () => {
    expect(bipActionLabel('submit')).toBe('Submitted for review')
    expect(bipActionLabel('approve')).toBe('Approved')
    expect(bipActionLabel('reject')).toBe('Rejected')
    expect(bipActionLabel('request_changes')).toBe('Changes requested')
    expect(bipActionLabel('approve_edit')).toBe('Edit approved')
    expect(bipActionLabel('admin_edit')).toBe('Edited by BipHub team')
  })

  it('maps every people-activity action to human copy', () => {
    expect(activityActionLabel('account_created')).toBe('Account created')
    expect(activityActionLabel('account_deleted')).toBe('Account deleted')
    expect(activityActionLabel('coordinator_request_filed')).toBe('Coordinator access requested')
    expect(activityActionLabel('student_profile_updated')).toBe('Profile updated')
    expect(activityActionLabel('alerts_subscribed')).toBe('Subscribed to BIP alerts')
    expect(activityActionLabel('alerts_cleared')).toBe('Cleared BIP alert preferences')
  })

  it('maps categories', () => {
    expect(activityCategoryLabel('coordinator')).toBe('Coordinators')
    expect(activityCategoryLabel('student')).toBe('Students')
    expect(activityCategoryLabel('admin')).toBe('Admins')
  })

  it('falls back to humanised raw strings instead of blank', () => {
    expect(bipActionLabel('some_future_kind')).toBe('Some Future Kind')
    expect(activityActionLabel('some_future_action')).toBe('Some Future Action')
  })
})
