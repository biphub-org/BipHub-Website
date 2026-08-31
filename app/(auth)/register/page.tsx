import Link from 'next/link'
import { LogoMark } from '@/components/home/LogoMark'

export default function RegisterChooserPage() {
  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Join BipHub
        </h1>
        <p className="text-center text-sm text-muted">
          Choose how you want to use BipHub.
        </p>
      </header>

      <div className="grid gap-4">
        <Link
          href="/register/coordinator"
          className="block rounded-lg border border-border p-5 hover:border-eu-blue hover:bg-bg-soft transition-colors group"
        >
          <h2 className="text-base font-semibold text-ink group-hover:text-eu-blue">
            I&apos;m a coordinator
          </h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            List and manage your university&apos;s Blended Intensive Programs.
          </p>
          <span className="mt-3 inline-flex text-sm font-semibold text-eu-blue group-hover:underline">
            Create coordinator account →
          </span>
        </Link>

        <Link
          href="/register/student"
          className="block rounded-lg border border-border p-5 hover:border-eu-blue hover:bg-bg-soft transition-colors group"
        >
          <h2 className="text-base font-semibold text-ink group-hover:text-eu-blue">
            I&apos;m a student
          </h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Discover BIPs, save favourites and get alerts.
          </p>
          <span className="mt-3 inline-flex text-sm font-semibold text-eu-blue group-hover:underline">
            Create student account →
          </span>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-eu-blue font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </section>
  )
}
