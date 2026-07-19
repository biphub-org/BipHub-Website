import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DatePicker } from '@/components/ui/date-picker'

describe('DatePicker — trigger display', () => {
  it('shows the placeholder when empty', () => {
    render(<DatePicker value="" onChange={() => {}} placeholder="Select a date" />)
    expect(screen.getByRole('button').textContent).toContain('Select a date')
  })

  it('shows the long-form "10th January 2026" when a value is set', () => {
    render(<DatePicker value="2026-01-10" onChange={() => {}} />)
    expect(screen.getByRole('button').textContent).toContain('10th January 2026')
  })

  it('forwards aria-label and aria-invalid to the trigger button', () => {
    render(
      <DatePicker
        value=""
        onChange={() => {}}
        aria-label="Application deadline"
        aria-invalid
      />,
    )
    const btn = screen.getByRole('button', { name: /application deadline/i })
    expect(btn.getAttribute('aria-invalid')).toBe('true')
  })
})
