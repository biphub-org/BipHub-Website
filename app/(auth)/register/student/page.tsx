import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/home/LogoMark'
import { StudentRegisterForm } from '@/components/auth/StudentRegisterForm'

/**
 * /register/student — student email+password registration (no email confirmation).
 * On success the Server Action auto-signs in and redirects to /student-dashboard.
 */

export const metadata: Metadata = {
  title: 'Create your student account · BipHub',
}

export default async function StudentRegisterPage() {
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

  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Create your student account
        </h1>
        <p className="text-center text-sm text-muted">
          Discover BIPs, save favourites and get alerts.
        </p>
      </header>
      <StudentRegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        Are you a coordinator?{' '}
        <Link href="/register/coordinator" className="text-eu-blue font-semibold hover:underline">
          Create coordinator account
        </Link>
      </p>
    </section>
  )
}
