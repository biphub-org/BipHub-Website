import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentBips } from '@/components/home/RecentBips'
import type { BipWithRelations } from '@/lib/types/bip'

// motion's useInView needs IntersectionObserver — stub it; elements stay
// in their hidden variant but remain in the DOM, which is all we assert on.
beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

function fakeBip(id: string, title: string): BipWithRelations {
  return {
    id,
    slug: `bip-${id}`,
    title,
    status: 'approved',
    subject_areas: [],
    host_university: { name: 'Test University', country: 'BE' },
  } as unknown as BipWithRelations
}

describe('RecentBips gate — teaser only when catalog is empty', () => {
  it('renders the teaser when zero BIPs are approved', () => {
    render(<RecentBips totalApprovedCount={0} bips={[]} />)
    expect(screen.getByText(/be among the first/i)).toBeDefined()
    expect(screen.queryByText(/fresh opportunities/i)).toBeNull()
  })

  it('renders cards as soon as any BIP is approved (no minimum)', () => {
    render(
      <RecentBips
        totalApprovedCount={2}
        bips={[fakeBip('1', 'First BIP'), fakeBip('2', 'Second BIP')]}
      />,
    )
    expect(screen.getByText(/fresh opportunities/i)).toBeDefined()
    expect(screen.getByText('First BIP')).toBeDefined()
    expect(screen.getByText('Second BIP')).toBeDefined()
    expect(screen.getByText(/browse all 2 bips/i)).toBeDefined()
    expect(screen.queryByText(/be among the first/i)).toBeNull()
  })
})
