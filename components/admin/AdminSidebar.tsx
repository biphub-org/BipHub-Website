'use client'

/**
 * AdminSidebar — admin chrome (D-16 / 03-UI-SPEC.md Sidebar Chrome Contract).
 *
 * Composition (desktop ≥ md):
 *   240px sticky left column. Logo + nav (Queue / All BIPs / Analytics) +
 *   admin avatar/name/email + Sign out form.
 *
 * Composition (mobile < md):
 *   56px top bar with burger menu → Sheet drawer mirroring desktop body.
 *
 * Client component required for `usePathname()` (active-link highlight) and
 * Sheet open/close state. Sign-out remains a Server Action invoked via
 * `<form action={signOutAction}>` — works inside a client component.
 *
 * Tailwind v4 static-class compliance (CLAUDE.md never-do):
 *   - No template-literal class names.
 *   - Active/resting nav-item classes are full strings in lookup constants.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Inbox,
  ListChecks,
  BarChart3,
  Users,
  LogOut,
  Menu,
} from 'lucide-react'
import { LogoMark } from '@/components/home/LogoMark'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { signOutAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils/cn'

type NavItem = {
  href: string
  label: string
  icon: typeof Inbox
  matchExact?: boolean
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/admin', label: 'Queue', icon: Inbox, matchExact: true },
  { href: '/admin/bips', label: 'All BIPs', icon: ListChecks },
  { href: '/admin/my-bips', label: 'My BIPs', icon: ListChecks },
  { href: '/admin/coordinators', label: 'Coordinators', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

// Lookup constants — NEVER template-literal Tailwind classes (CLAUDE.md).
const NAV_ITEM_BASE =
  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition'
const NAV_ITEM_ACTIVE = 'bg-eu-blue-50 text-eu-blue font-semibold'
const NAV_ITEM_RESTING =
  'text-ink-2 font-normal hover:text-ink hover:bg-bg-soft'

function AdminNavItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(NAV_ITEM_BASE, isActive ? NAV_ITEM_ACTIVE : NAV_ITEM_RESTING)}
    >
      <Icon size={20} aria-hidden />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarBody({
  initials,
  fullName,
  email,
  onNavClick,
}: {
  initials: string
  fullName: string
  email: string
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = (item: NavItem) =>
    item.matchExact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <div className="flex flex-col h-full px-4 py-6">
      <Link href="/" className="flex items-center gap-2 mb-6">
        <LogoMark />
        <span className="text-base font-bold text-ink">BipHub</span>
        <span className="text-xs text-muted ml-1">Admin</span>
      </Link>
      <nav className="flex flex-col gap-1" aria-label="Admin">
        {NAV_ITEMS.map((item) => (
          <AdminNavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            onClick={onNavClick}
          />
        ))}
      </nav>
      <div className="flex-1" />
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-eu-blue-50 text-eu-blue text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm text-ink truncate">{fullName || 'Admin'}</p>
          <p className="text-xs text-muted truncate">{email}</p>
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted hover:text-ink hover:bg-bg-soft transition"
        >
          <LogOut size={16} aria-hidden />
          <span>Sign out</span>
        </button>
      </form>
    </div>
  )
}

export function AdminSidebar({
  initials,
  fullName,
  email,
}: {
  initials: string
  fullName: string
  email: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar (≥ md). Plan 01-04 overrides md to 60rem / 960px. */}
      <aside className="hidden md:flex md:flex-col w-[240px] min-h-screen border-r border-border bg-white sticky top-0 h-screen">
        <SidebarBody initials={initials} fullName={fullName} email={email} />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-border flex items-center justify-between px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Open admin menu">
                <Menu size={20} aria-hidden />
              </Button>
            }
          />
          <SheetContent side="left" className="w-[280px] p-0">
            <SidebarBody
              initials={initials}
              fullName={fullName}
              email={email}
              onNavClick={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-sm font-semibold text-ink">BipHub Admin</span>
        </Link>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-eu-blue-50 text-eu-blue text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
      {/* Spacer for mobile top bar (admin layout is flex-row). */}
      <div className="md:hidden h-14" />
    </>
  )
}
