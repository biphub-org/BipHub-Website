import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StudentProfileForm } from '@/components/student/StudentProfileForm'
import {
  saveStudentProfileAction,
  updateStudentProfileAction,
} from '@/lib/actions/profile'

vi.mock('@/lib/actions/profile', () => ({
  saveStudentProfileAction: vi.fn(),
  updateStudentProfileAction: vi.fn(),
}))

vi.mock('@/lib/actions/universities', () => ({
  searchUniversitiesAction: vi.fn().mockResolvedValue([]),
  addUniversityAction: vi.fn(),
}))

const baseProps = {
  initialFullName: 'Jane Smith',
  initialCountry: 'BE',
  initialUniversityId: '',
  initialUniversities: [],
}

beforeEach(() => {
  vi.mocked(saveStudentProfileAction).mockReset()
  vi.mocked(updateStudentProfileAction).mockReset()
})

describe('StudentProfileForm edit mode (student dashboard)', () => {
  it('saves via updateStudentProfileAction and confirms inline', async () => {
    vi.mocked(updateStudentProfileAction).mockResolvedValue({ success: true })
    render(<StudentProfileForm {...baseProps} mode="edit" />)

    expect((screen.getByLabelText(/full name/i) as HTMLInputElement).value).toBe(
      'Jane Smith',
    )

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateStudentProfileAction).toHaveBeenCalledTimes(1)
    })
    const fd = vi.mocked(updateStudentProfileAction).mock.calls[0][0] as FormData
    expect(fd.get('full_name')).toBe('Jane Smith')
    expect(fd.get('country')).toBe('BE')
    expect(await screen.findByText(/profile updated/i)).toBeDefined()
    expect(saveStudentProfileAction).not.toHaveBeenCalled()
  })

  it('surfaces the server error inline without confirming', async () => {
    vi.mocked(updateStudentProfileAction).mockResolvedValue({
      error: 'Failed to save your profile. Please try again.',
    })
    render(<StudentProfileForm {...baseProps} mode="edit" />)

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(
      await screen.findByText(/failed to save your profile/i),
    ).toBeDefined()
    expect(screen.queryByText(/profile updated/i)).toBeNull()
  })
})
