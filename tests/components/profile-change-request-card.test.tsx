import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProfileChangeRequestCard } from '@/components/admin/ProfileChangeRequestCard'
import type { AdminProfileChangeRequest } from '@/lib/queries/profileChangeRequests'
import { useRouter } from 'next/navigation'

/**
 * Data-changes inbox diff (admin review card).
 *
 * Only CHANGED fields render a before → after diff (strikethrough old
 * value + arrow + new value). Unchanged fields render as a plain value —
 * never scratched out and re-shown as if they changed.
 */

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/app/(admin)/admin/coordinators/data-changes/actions', () => ({
  approveProfileChangeRequestAction: vi.fn(),
  declineProfileChangeRequestAction: vi.fn(),
}))

const UNI = { id: 'uni-1', name: 'Same University', country: 'NL' }

function request(): AdminProfileChangeRequest {
  return {
    id: 'req-1',
    coordinator_id: 'user-1',
    coordinator_email: 'same@uni.edu',
    status: 'pending',
    requested_full_name: 'New Name',
    requested_contact_email: 'same@uni.edu',
    requested_erasmus_code: 'SAME01',
    requested_university: { ...UNI },
    admin_note: null,
    created_at: '2026-09-22T10:00:00Z',
    reviewed_at: null,
    current_full_name: 'Old Name',
    current_contact_email: 'same@uni.edu',
    current_erasmus_code: 'SAME01',
    current_university: { ...UNI },
  }
}

/** Find the diff <div> row for a label inside the card's <dl>. */
function diffRow(container: HTMLElement, label: string): HTMLElement {
  const dl = container.querySelector('dl')
  expect(dl).not.toBeNull()
  const rows = [...(dl as HTMLElement).querySelectorAll(':scope > div')]
  const row = rows.find(
    (r) => r.querySelector('dt')?.textContent === label,
  ) as HTMLElement | undefined
  expect(row, `diff row "${label}"`).toBeDefined()
  return row as HTMLElement
}

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as never)
})

describe('ProfileChangeRequestCard diff', () => {
  it('renders before → after only for the changed field', () => {
    const { container } = render(<ProfileChangeRequestCard request={request()} />)

    const nameRow = diffRow(container, 'Full name')
    expect(nameRow.querySelector('.line-through')?.textContent).toBe('Old Name')
    expect(nameRow.textContent).toContain('→')
    expect(nameRow.textContent).toContain('New Name')
  })

  it('renders unchanged fields as plain values with no strikethrough or arrow', () => {
    const { container } = render(<ProfileChangeRequestCard request={request()} />)

    for (const label of ['Contact email', 'University', 'Erasmus code']) {
      const row = diffRow(container, label)
      expect(row.querySelector('.line-through'), `${label} scratch`).toBeNull()
      expect(row.textContent, `${label} arrow`).not.toContain('→')
    }
    expect(diffRow(container, 'Contact email').textContent).toContain(
      'same@uni.edu',
    )
    expect(diffRow(container, 'Erasmus code').textContent).toContain('SAME01')
  })
})
