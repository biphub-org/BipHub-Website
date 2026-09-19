import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminSidebar, NAV_ITEMS } from '@/components/admin/AdminSidebar'

/**
 * Admin sidebar coordinator-request signal: there is deliberately NO separate
 * inbox link — pending access requests surface as a count pill on the
 * Coordinators entry (the inbox itself lives at
 * /admin/coordinators/requests, one click deeper).
 */
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }))
vi.mock('@/lib/actions/auth', () => ({ signOutAction: vi.fn() }))

describe('AdminSidebar coordinator-request signal', () => {
  it('has no separate access-requests nav entry', () => {
    expect(NAV_ITEMS.some((i) => i.href === '/admin/coordinators/requests')).toBe(false)
    render(<AdminSidebar initials="A" fullName="Admin" email="a@x.io" />)
    expect(screen.queryByRole('link', { name: /access requests/i })).toBeNull()
  })

  it('shows the pending count pill on Coordinators when > 0', () => {
    render(
      <AdminSidebar
        initials="A"
        fullName="Admin"
        email="a@x.io"
        pendingRequestCount={3}
      />,
    )
    expect(screen.getByRole('link', { name: /coordinators 3 pending review/i }))
  })

  it('hides the pill when there is nothing pending', () => {
    const { rerender } = render(
      <AdminSidebar initials="A" fullName="Admin" email="a@x.io" />,
    )
    expect(screen.queryByText('pending review')).toBeNull()
    rerender(
      <AdminSidebar
        initials="A"
        fullName="Admin"
        email="a@x.io"
        pendingRequestCount={0}
      />,
    )
    expect(screen.queryByText('pending review')).toBeNull()
    expect(screen.getByRole('link', { name: /^coordinators$/i }))
  })
})
