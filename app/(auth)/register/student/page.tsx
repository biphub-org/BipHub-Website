import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/home/LogoMark'
import { StudentMagicLinkForm } from '@/components/auth/StudentMagicLinkForm'

/**
 * /register/student — magic-link student sign-in (RSC).
 *
 * STUD-01 / 05-UI-SPEC Surface 1.
 *
 * Responsibilities:
 *   1. Already-authenticated bounce (D-13): server-side role-based redirect.
 *      The middleware matcher excludes /register/* so this page must do its own
 *      check for signed-in visitors.
 *   2. Map ?error=expired → expiredError prop (State C Alert in form).
 *   3. Render card shell: LogoMark + heading + subtitle + StudentMagicLinkForm.
 *
 * Single page handles new sign-up and returning sign-in — magic-link UX makes
 * the distinction invisible. No /login/student page exists.
 */

export const metadata: Metadata = {
  title: 'Sign in · BipHub',
}

export default async function StudentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string }>
}) {
  const sp = await searchParams

  // (D-13) Already-authenticated bounce — handled here, NOT in middleware
  // (matcher excludes /register/* from middleware execution, per 05-02 design).
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) {
    const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata?.role
    if (role === 'student') redirect('/student-dashboard')
    if (role === 'coordinator') redirect('/dashboard')
    if (role === 'admin') redirect('/admin')
    // Unknown role: fall through to form (safe default)
  }

  // Map ?error=expired → State C expired alert (UI-SPEC Copywriting Contract)
  const expiredError =
    sp.error === 'expired'
      ? 'This sign-in link has expired. Request a new one below.'
      : undefined

  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Sign in to BipHub
        </h1>
        <p className="text-center text-sm text-muted">
          No password needed — we&apos;ll email you a sign-in link.
        </p>
      </header>
      <StudentMagicLinkForm expiredError={expiredError} />
    </section>
  )
}
