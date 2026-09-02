import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WizardStep5Preview } from '@/components/forms/steps/WizardStep5Preview'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const host = { id: 'uni-1', name: 'Test University', country: 'BE' }

describe('WizardStep5Preview — coordinator vs admin copy', () => {
  it('defaults to the review copy (Submit for review)', () => {
    render(<WizardStep5Preview hostUniversity={host} />)
    expect(
      screen.getByRole('button', { name: /submit for review/i }),
    ).toBeDefined()
    expect(
      screen.getByText(/won't be visible publicly until reviewed/i),
    ).toBeDefined()
  })

  it('shows publish copy in admin mode (direct-publish, no review step)', () => {
    render(<WizardStep5Preview hostUniversity={host} mode="admin" />)
    expect(
      screen.getByRole('button', { name: /publish bip/i }),
    ).toBeDefined()
    expect(
      screen.getByText(/visible publicly immediately/i),
    ).toBeDefined()
    expect(screen.queryByText(/submit for review/i)).toBeNull()
  })
})
