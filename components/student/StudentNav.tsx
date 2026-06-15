import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'
import { signOutStudentAction } from '@/lib/actions/auth'

/**
 * StudentNav — RSC nav chrome for the (student) route group.
 *
 * 05-UI-SPEC Surface 2 — StudentNav spec.
 *
 * Structure:
 *   Left:  LogoMark + "BipHub" wordmark + "/" separator + "Student dashboard" label
 *   Right: email initials avatar (bg-eu-blue/10 text-eu-blue, 32×32) + Sign out form
 *
 * Sign out: <form action={signOutStudentAction}> → redirects to / (D-15).
 * No settings link in Phase 5 (no student profile editing yet).
 *
 * Mirrors DashboardNav structure but scoped to student routes.
 */

interface StudentNavProps {
  email: string
}

export function StudentNav({ email }: StudentNavProps) {
  // Derive 2-letter initials from the local part of the email address.
  // Falls back to '··' if the email is empty or the local part is too short.
  const localPart = email.split('@')[0] ?? ''
  const initials =
    localPart.length >= 2
      ? localPart.slice(0, 2).toUpperCase()
      : localPart.length === 1
        ? localPart.toUpperCase()
        : '··'

  return (
    <header
      className="h-16 border-b border-border bg-white"
      aria-label="Student dashboard navigation"
    >
      <div className="mx-auto flex h-full max-w-[960px] items-center justify-between px-4 md:px-6">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            <LogoMark />
            <span className="text-base">BipHub</span>
          </Link>
          <span aria-hidden className="text-muted">
            /
          </span>
          <span className="text-sm text-muted">Student dashboard</span>
        </div>

        {/* Right: initials avatar + sign out */}
        <div className="flex items-center gap-3">
          <span
            aria-label={`Student profile (${initials})`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-eu-blue/10 text-eu-blue text-sm font-semibold"
          >
            {initials}
          </span>
          <form action={signOutStudentAction}>
            <button
              type="submit"
              aria-label="Sign out of BipHub"
              className="text-sm text-muted hover:text-ink p-2 -m-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
