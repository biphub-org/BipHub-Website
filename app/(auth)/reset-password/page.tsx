import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'
import { PasswordResetForm } from '@/components/auth/PasswordResetForm'

export default function ResetPasswordPage() {
  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Reset your password
        </h1>
        <p className="text-center text-sm text-muted">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </header>
      <PasswordResetForm />
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-eu-blue font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  )
}
