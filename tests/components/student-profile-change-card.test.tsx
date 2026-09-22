import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudentProfileChangeCard } from '@/components/admin/StudentProfileChangeCard'
import { useRouter } from 'next/navigation'
import { markStudentProfileChangeReadAction } from '@/lib/actions/student-profile-changes'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/lib/actions/student-profile-changes', () => ({
  markStudentProfileChangeReadAction: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({ refresh: vi.fn() } as never)
  vi.mocked(markStudentProfileChangeReadAction).mockResolvedValue({ success: true })
})

/**
 * StudentProfileChangeCard — read-only before → after card for the
 * "Recent profile changes" section on /admin/students.
 */

const CHANGE = {
  id: 'chg-1',
  studentId: 'student-1',
  studentName: 'Jane Student',
  studentEmail: 'jane@uni.edu',
  changes: [
    { label: 'Full name', before: 'Jane Old', after: 'Jane Student' },
    { label: 'Country', before: 'Germany', after: 'France' },
  ],
  createdAt: '2026-09-22T10:00:00Z',
}

describe('StudentProfileChangeCard', () => {
  it('links the student name to their admin detail page', () => {
    render(<StudentProfileChangeCard change={CHANGE} />)
    expect(
      screen.getByRole('link', { name: 'Jane Student' }).getAttribute('href'),
    ).toBe('/admin/students/student-1')
  })

  it('renders before scratched out → after per changed field', () => {
    const { container } = render(<StudentProfileChangeCard change={CHANGE} />)
    const struck = [...container.querySelectorAll('.line-through')].map(
      (el) => el.textContent,
    )
    expect(struck).toContain('Jane Old')
    expect(struck).toContain('Germany')
    expect(container.textContent).toContain('→')
    expect(container.textContent).toContain('Jane Student')
    expect(container.textContent).toContain('France')
    expect(screen.getByText('jane@uni.edu')).toBeDefined()
  })
})

describe('StudentProfileChangeCard mark as read', () => {
  it('calls the read action for the card change id', async () => {
    render(<StudentProfileChangeCard change={CHANGE} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    await waitFor(() => {
      expect(markStudentProfileChangeReadAction).toHaveBeenCalledWith('chg-1')
    })
  })
})
