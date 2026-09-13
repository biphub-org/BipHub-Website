import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

/**
 * CTA single-source contract: every call-to-action button derives its
 * design/animation from these variants. Hand-rolled pill CTAs elsewhere
 * must convert to <Button> instead of copying these classes.
 */
describe('Button — CTA design contract', () => {
  it('is pill-shaped in every variant, with lift on the CTA variants', () => {
    for (const variant of ['primary', 'gold', 'ghost'] as const) {
      const { unmount } = render(
        <Button variant={variant}>{variant} label</Button>,
      )
      const el = screen.getByRole('button', { name: `${variant} label` })
      expect(el.className).toContain('rounded-pill')
      if (variant === 'ghost') {
        expect(el.className).not.toContain('hover:-translate-y-px')
      } else {
        expect(el.className).toContain('hover:-translate-y-px')
      }
      unmount()
    }
  })

  it('gives gold CTAs the same hover shadow as the hero CTA', () => {
    render(<Button variant="gold">Gold label</Button>)
    expect(
      screen.getByRole('button', { name: 'Gold label' }).className,
    ).toContain('hover:shadow-[0_8px_28px_rgba(255,204,0,0.35)]')
  })

  it('gives primary CTAs the blue hover shadow', () => {
    render(<Button variant="primary">Primary label</Button>)
    expect(
      screen.getByRole('button', { name: 'Primary label' }).className,
    ).toContain('hover:shadow-[0_6px_20px_rgba(0,51,153,0.25)]')
  })

  it('renders as an anchor via asChild without losing variant classes', () => {
    render(
      <Button variant="gold" size="lg" asChild>
        <a href="/bips">Gold link</a>
      </Button>,
    )
    const el = screen.getByRole('link', { name: 'Gold link' })
    expect(el.tagName).toBe('A')
    expect(el.className).toContain('rounded-pill')
    expect(el.className).toContain('bg-eu-gold')
  })
})
