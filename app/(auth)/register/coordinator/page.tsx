import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function CoordinatorRegisterPage() {
  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Create your coordinator account
        </h1>
        <p className="text-center text-sm text-muted">
          Join BipHub to list your university&apos;s Blended Intensive Programs.
        </p>
      </header>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        Are you a student?{' '}
        <Link href="/register/student" className="text-eu-blue font-semibold hover:underline">
          Student sign-in
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
