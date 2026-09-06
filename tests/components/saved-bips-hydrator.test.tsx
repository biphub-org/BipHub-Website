import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { SavedBipsHydrator } from '@/components/bip/SavedBipsHydrator'
import { useSavedBipsStore } from '@/lib/store/saved-bips'
import { getSavedStateAction } from '@/lib/actions/saved-bips'

vi.mock('@/lib/actions/saved-bips', () => ({
  getSavedStateAction: vi.fn(),
  saveAction: vi.fn().mockResolvedValue({}),
  unsaveAction: vi.fn().mockResolvedValue({}),
}))

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
  vi.mocked(getSavedStateAction).mockReset()
})

describe('SavedBipsHydrator — revalidates on every mount', () => {
  it('hydrates a fresh store from the server', async () => {
    vi.mocked(getSavedStateAction).mockResolvedValue({
      savedIds: ['bip-1'],
      isStudent: true,
      isSignedIn: true,
    })
    render(<SavedBipsHydrator />)
    await waitFor(() => {
      const s = useSavedBipsStore.getState()
      expect(s.hydrated).toBe(true)
      expect(s.isStudent).toBe(true)
      expect(s.isSignedIn).toBe(true)
      expect(s.savedIds.has('bip-1')).toBe(true)
    })
  })

  it('refreshes an already-hydrated store when the session changed (no reload needed)', async () => {
    // Store holds a stale student session from an earlier page view…
    useSavedBipsStore.getState().hydrate(['bip-1'], true, true)
    // …but the server now reports a signed-in coordinator.
    vi.mocked(getSavedStateAction).mockResolvedValue({
      savedIds: [],
      isStudent: false,
      isSignedIn: true,
    })
    render(<SavedBipsHydrator />)
    await waitFor(() => {
      const s = useSavedBipsStore.getState()
      expect(s.isStudent).toBe(false)
      expect(s.isSignedIn).toBe(true)
      expect(s.savedIds.has('bip-1')).toBe(false)
    })
  })

  it('leaves the store untouched when the fetch fails', async () => {
    vi.mocked(getSavedStateAction).mockRejectedValue(new Error('offline'))
    render(<SavedBipsHydrator />)
    // Let the rejection settle — no throw, no hydration.
    await waitFor(() => {
      expect(vi.mocked(getSavedStateAction)).toHaveBeenCalled()
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(useSavedBipsStore.getState().hydrated).toBe(false)
  })
})
