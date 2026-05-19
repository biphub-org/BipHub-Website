'use client'

/**
 * BipHub sticky navigation — client component (uses usePathname for active links).
 *
 * Desktop (≥960px / md:): logo + wordmark + 4 nav links + right-side block.
 * Mobile (<960px): logo + primary CTA + hamburger triggering a Sheet drawer with full nav.
 *
 * Phase 2 (D-15): right-side block + Sheet bottom CTAs branch on `hasClaims`.
 *   - Logged-out: Sign in (ghost) + List your BIP (primary)
 *   - Logged-in:  Dashboard link + initials avatar
 * Props are derived in (public)/layout.tsx via getClaims() and a profile fetch,
 * passed in as plain serializable props (no client-side flash).
 *
 * FOUN-03: Sheet is keyboard-accessible by default (focus trap, Escape to close,
 * focus return to trigger). WCAG AA for <960px viewports.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoMark } from './LogoMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const NAV_LINKS = [
  { href: '/bips', label: 'Browse BIPs' },
  { href: '/what-is-a-bip', label: 'What is a BIP?' },
  { href: '/guides', label: 'Guides' },
] as const

// Pages whose top-of-page hero is dark — nav starts transparent over them and
// flips to solid white on scroll. All other public pages stay solid by default.
const DARK_HERO_ROUTES = ['/', '/bips', '/what-is-a-bip', '/guides'] as const

function pageHasDarkHero(pathname: string): boolean {
  return DARK_HERO_ROUTES.some(
    (route) =>
      pathname === route || (route !== '/' && pathname.startsWith(route + '/')),
  )
}

interface StickyNavProps {
  hasClaims?: boolean
  initials?: string | null
}

export function StickyNav({ hasClaims = false, initials = null }: StickyNavProps) {
  const pathname = usePathname()
  const hasDarkHero = pageHasDarkHero(pathname)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!hasDarkHero) return
    // Threshold tuned to roughly half the hero height — the white panel
    // shouldn't appear the moment the user nudges the wheel.
    const onScroll = () => setScrolled(window.scrollY > 100)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hasDarkHero])

  // Transparent mode is active when the page has a dark hero AND we're at the top.
  const transparent = hasDarkHero && !scrolled

  return (
    <>
      {/* When the page does NOT have a dark hero, reserve 68px of layout space
          since the nav itself is fixed (out of flow). Dark-hero pages omit this
          so the hero extends behind the transparent nav. */}
      {!hasDarkHero && <div aria-hidden className="h-[68px]" />}
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-[68px] w-full transition-colors duration-200',
        transparent
          ? 'border-b border-transparent bg-transparent'
          : 'border-b border-border bg-white/85 backdrop-blur-md backdrop-saturate-150',
      )}
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={cn(
              'flex w-fit items-center gap-2 font-bold transition-colors',
              transparent ? 'text-white' : 'text-ink',
            )}
          >
            <LogoMark />
            <span className="text-base">BipHub</span>
          </Link>

          {/* Desktop nav — gold text on hover/active. Hidden below 960px. */}
          <nav className="hidden md:flex" aria-label="Primary navigation">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-eu-gold',
                        isActive
                          ? 'text-eu-gold'
                          : transparent
                            ? 'text-white/85'
                            : 'text-ink-2',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {hasClaims ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  'hidden md:inline text-sm font-semibold transition-colors',
                  transparent ? 'text-white hover:text-eu-gold' : 'text-ink hover:text-eu-blue',
                )}
              >
                Dashboard
              </Link>
              <span
                aria-label="Coordinator profile"
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                  transparent
                    ? 'bg-white/15 text-white'
                    : 'bg-eu-blue/10 text-eu-blue',
                )}
              >
                {initials ?? '··'}
              </span>
            </>
          ) : (
            <Link href="/register">
              <Button
                variant="primary"
                size="sm"
                className={cn(
                  'transition-colors',
                  transparent &&
                    'bg-white text-eu-blue border-white hover:bg-white/90 hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)]',
                )}
              >
                List your BIP
              </Button>
            </Link>
          )}

          {/* Mobile nav menu — Sheet drawer for <960px viewports.
              Owned end-to-end by Plan 01-04. NOT deferred to downstream plans.
              Keyboard-accessible: focus trap, Escape closes, focus returns to trigger. */}
          <Sheet>
            <SheetTrigger
              className={cn(
                'md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue transition-colors',
                transparent
                  ? 'border-white/30 text-white hover:bg-white/10'
                  : 'border-border text-ink-2 hover:bg-bg-soft',
              )}
              aria-label="Open navigation menu"
            >
              <span aria-hidden="true" className="text-base leading-none">☰</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile primary">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={
                      <Link
                        href={link.href}
                        className="block px-2 py-3 text-base font-medium text-ink hover:text-eu-blue rounded-md hover:bg-bg-soft"
                      >
                        {link.label}
                      </Link>
                    }
                  />
                ))}
                <div className="mt-2 border-t border-border pt-4 flex flex-col gap-2">
                  {hasClaims ? (
                    <SheetClose
                      render={
                        <Link href="/dashboard" className="inline-flex">
                          <Button variant="primary" className="w-full">Dashboard</Button>
                        </Link>
                      }
                    />
                  ) : (
                    <SheetClose
                      render={
                        <Link href="/register" className="inline-flex">
                          <Button variant="primary" className="w-full">List your BIP</Button>
                        </Link>
                      }
                    />
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    </>
  )
}
