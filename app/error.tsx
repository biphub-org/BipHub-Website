'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-soft px-4">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-ink-2 transition-colors hover:text-eu-blue"
        >
          ← BipHub
        </Link>
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
            <IconAlertTriangle size={36} className="text-eu-gold" aria-hidden="true" />
          </div>
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[1px] text-eu-blue">
          <span aria-hidden="true" className="mr-2 text-eu-gold">—</span>
          Something went wrong
        </p>
        <h1
          className="mb-4 font-bold text-ink"
          style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            lineHeight: '1.15',
            letterSpacing: '-1px',
          }}
        >
          We hit an unexpected error
        </h1>
        <p className="mb-8 text-[17px] leading-relaxed text-muted">
          Sorry about that. Try reloading — if the issue keeps happening, let us
          know at{' '}
          <a
            href="mailto:biphub.org@gmail.com"
            className="text-eu-blue underline"
          >
            biphub.org@gmail.com
          </a>
          .
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back home</Link>
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-10 whitespace-pre-wrap rounded-md bg-white p-4 text-left text-xs text-red-600 shadow-sm">
            {error.message}
            {error.digest && `\n\ndigest: ${error.digest}`}
          </pre>
        )}
      </div>
    </main>
  )
}
