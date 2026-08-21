import Link from 'next/link'
import { IconSettings } from '@tabler/icons-react'
import { LogoMark } from '@/components/home/LogoMark'
import { signOutAction } from '@/lib/actions/auth'

/**
 * DashboardNav — RSC chrome for the (dashboard) route group (D-14).
 *
 * Composition: BipHub logo + breadcrumb separator + "Dashboard" label on the
 * left; full name (md+) + initials avatar + Sign out on the right.
 *
 * Sign out uses a `<form action={signOutAction}>` so the bundle stays
 * server-only — no `'use client'` here. The Server Action handles
 * supabase.auth.signOut + revalidatePath + redirect('/login').
 */
interface DashboardNavProps {
  initials: string
  fullName: string
}

export function DashboardNav({ initials, fullName }: DashboardNavProps) {
  return (
    <header
      className="h-16 border-b border-border bg-white"
      role="navigation"
      aria-label="Dashboard"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            <LogoMark />
            <span className="text-base">BipHub</span>
          </Link>
          <span aria-hidden className="text-muted">
            /
          </span>
          <span className="text-sm text-muted">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {fullName && (
            <span aria-hidden className="hidden md:inline text-sm text-ink-2">
              {fullName}
            </span>
          )}
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-bg-soft transition-colors"
          >
            <IconSettings className="h-5 w-5" aria-hidden />
          </Link>
          <span
            aria-label={`Coordinator profile (${initials})`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-eu-blue/10 text-eu-blue text-sm font-semibold"
          >
            {initials}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="text-sm text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
