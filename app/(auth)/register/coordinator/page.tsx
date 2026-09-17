import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'
import { CoordinatorRequestForm } from '@/components/auth/CoordinatorRequestForm'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { redirectIfSignedIn } from '@/lib/auth/redirect'

/**
 * /register/coordinator — coordinator access request.
 *
 * Coordinators do NOT self-register with a password. They submit the
 * onboarding details + login email; an admin approves or rejects the request
 * (/admin/coordinators/requests), and approved coordinators set their
 * password via the Supabase invite link before signing in.
 */
export default async function CoordinatorRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  // Signed-in users have no business on the register pages (typed URL included).
  await redirectIfSignedIn()

  // Prefill from the login no-account screen (?email=...).
  const sp = await searchParams
  const initialEmail = typeof sp.email === 'string' ? sp.email : ''

  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Request coordinator access
        </h1>
        <p className="text-center text-sm text-muted">
          Tell us who you are and which university you represent. An admin will
          review your request — approval usually takes a few days.
        </p>
      </header>
      <CoordinatorRequestForm initialUniversities={await searchUniversitiesAction('')} initialEmail={initialEmail} />
      <p className="mt-6 text-center text-sm text-muted">
        Are you a student?{' '}
        <Link href="/register/student" className="text-eu-blue font-semibold hover:underline">
          Create student account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-eu-blue font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  )
}
