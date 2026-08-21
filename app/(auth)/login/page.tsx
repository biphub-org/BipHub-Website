import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'
import { LoginForm } from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams
  const initialError =
    sp.error === 'verification_failed'
      ? 'Email verification failed. Please try registering again.'
      : undefined

  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Sign in to BipHub
        </h1>
      </header>
      <LoginForm initialError={initialError} />
      <p className="mt-6 text-center text-sm text-muted">
        No account yet?{' '}
        <Link href="/register" className="text-eu-blue font-semibold hover:underline">
          Register
        </Link>
      </p>
    </section>
  )
}
