import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveToggleIsland } from '@/components/bip/SaveToggleIsland'
import { useSavedBipsStore } from '@/lib/store/saved-bips'
import { useRouter } from 'next/navigation'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))
vi.mock('@/lib/actions/saved-bips', () => ({
  saveAction: vi.fn().mockResolvedValue({}),
  unsaveAction: vi.fn().mockResolvedValue({}),
}))

const mockPush = vi.fn()
const TITLE = 'Test BIP'

function resetStore() {
  useSavedBipsStore.setState({
    savedIds: new Set<string>(),
    isStudent: false,
    isSignedIn: false,
    hydrated: false,
  })
}

beforeEach(() => {
  resetStore()
  mockPush.mockClear()
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as never)
})

describe('SaveToggleIsland visibility — signed-out + students only', () => {
  it('button mode: signed-out visitor (defaults) sees "Sign in to save"', () => {
    render(<SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="button" />)
    expect(screen.getByRole('button', { name: 'Sign in to save' })).toBeDefined()
  })

  it('button mode: signed-in student sees the save button', () => {
    render(
      <SaveToggleIsland
        bipId="bip-1"
        bipTitle={TITLE}
        displayStyle="button"
        isSignedIn
        isStudent
      />,
    )
    expect(screen.getByRole('button', { name: `Save ${TITLE}` })).toBeDefined()
  })

  it('button mode: signed-in coordinator renders nothing', () => {
    const { container } = render(
      <SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="button" isSignedIn />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('icon mode: signed-in admin (non-student) renders nothing', () => {
    const { container } = render(
      <SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="icon" isSignedIn />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('adopts a hydrated coordinator session from the store (ISR path) and hides', () => {
    useSavedBipsStore.getState().hydrate([], false, true)
    const { container } = render(
      <SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="button" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('adopts a hydrated student session from the store (ISR path) and shows', () => {
    useSavedBipsStore.getState().hydrate([], true, true)
    render(<SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="button" />)
    expect(screen.getByRole('button', { name: `Save ${TITLE}` })).toBeDefined()
  })

  it('signed-out click routes to /register/student', () => {
    render(<SaveToggleIsland bipId="bip-1" bipTitle={TITLE} displayStyle="button" />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to save' }))
    expect(mockPush).toHaveBeenCalledWith('/register/student')
  })
})
