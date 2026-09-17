import Link from 'next/link'
import { Metadata } from 'next'
import { LogoMark } from '@/components/home/LogoMark'
import { StudentRegisterForm } from '@/components/auth/StudentRegisterForm'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { redirectIfSignedIn } from '@/lib/auth/redirect'

/**
 * /register/student — student registration with email verification.
 * Collects personal details (full name, country, optional home university).
 * On success the Server Action sends a verification link; the student signs
 * in only after confirming their email.
 */

export const metadata: Metadata = {
  title: 'Create your student account · BipHub',
}

export default async function StudentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  // (D-13) Already-authenticated bounce — handled here, NOT in middleware
  // (matcher excludes /register/* from middleware execution, per 05-02 design).
  await redirectIfSignedIn()

  // Prefill from the login no-account screen (?email=...).
  const sp = await searchParams
  const initialEmail = typeof sp.email === 'string' ? sp.email : ''

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
      <StudentRegisterForm initialUniversities={await searchUniversitiesAction('')} initialEmail={initialEmail} />
      <p className="mt-6 text-center text-sm text-muted">
        Are you a coordinator?{' '}
        <Link href="/register/coordinator" className="text-eu-blue font-semibold hover:underline">
          Create coordinator account
        </Link>
      </p>
    </section>
  )
}
