'use client'

/**
 * StudentMagicLinkForm — STUD-01 / 05-UI-SPEC Surface 1.
 *
 * Manages three states:
 *   A: email-entry form (default)
 *   B: confirmation ("Check your email") after successful OTP dispatch
 *   C: expired-link alert (prop-driven; rendered above State A on mount)
 *
 * Calls signInWithOtpAction(formData) — Plan 02 Server Action.
 * Uses useTransition for loading state (no 'use client' sprawl beyond this file).
 *
 * Accessibility:
 *   - autoFocus on email input (State A)
 *   - aria-live="polite" wraps error alerts
 *   - State B focus moves to <h1> via ref.focus() (tabIndex={-1})
 *   - Submit button is min 44px tall (h-11 = 44px)
 */

import { useState, useTransition, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { signInWithOtpAction } from '@/lib/actions/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  expiredError?: string
}

export function StudentMagicLinkForm({ expiredError }: Props) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<'A' | 'B'>('A')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  // Resend cooldown state
  const [cooldown, setCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to "Check your email" heading on State B transition
  useEffect(() => {
    if (state === 'B') {
      confirmHeadingRef.current?.focus()
    }
  }, [state])

  function handleSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim()
    setError(undefined)
    startTransition(async () => {
      const result = await signInWithOtpAction(formData)
      if (result.error) {
        setError(result.error)
        return
      }
      setSubmittedEmail(email)
      setState('B')
    })
  }

  function handleResend() {
    if (cooldown > 0 || isPending) return
    setResendMessage(null)
    const fd = new FormData()
    fd.set('email', submittedEmail)
    startTransition(async () => {
      const result = await signInWithOtpAction(fd)
      if (result.error) {
        setResendMessage(result.error)
        return
      }
      setResendMessage('Sent — check your inbox.')
      setCooldown(30)
      const tick = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(tick)
            return 0
          }
          return c - 1
        })
      }, 1000)
    })
  }

  // State B: Confirmation view
  if (state === 'B') {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <h1
          ref={confirmHeadingRef}
          tabIndex={-1}
          className="text-[22px] font-semibold tracking-[-0.3px] text-ink outline-none"
        >
          Check your email
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed max-w-[320px]">
          We&apos;ve sent a sign-in link to{' '}
          <span className="font-semibold">{submittedEmail}</span>. Click the link
          to sign in — it expires in 1 hour.
        </p>

        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-sm text-muted">Didn&apos;t receive it?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending || cooldown > 0}
            className="text-sm text-eu-blue font-semibold hover:underline disabled:opacity-50 p-2 -m-2"
            aria-label="Resend sign-in link"
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : isPending
                ? 'Sending…'
                : 'Resend sign-in link'}
          </button>
          {resendMessage && (
            <p className="text-sm text-muted">{resendMessage}</p>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center gap-1">
          <p className="text-sm text-muted">Wrong email?</p>
          <button
            type="button"
            onClick={() => {
              setState('A')
              setError(undefined)
              setResendMessage(null)
              setCooldown(0)
            }}
            className="text-sm text-eu-blue font-semibold hover:underline p-2 -m-2"
          >
            Re-enter your email →
          </button>
        </div>
      </div>
    )
  }

  // State A: Email entry form (with optional State C expired Alert above)
  return (
    <div className="flex flex-col gap-4">
      {/* State C: expired-link alert (prop-driven, rendered server-side via expiredError prop) */}
      <div aria-live="polite">
        {expiredError && !error && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{expiredError}</AlertDescription>
          </Alert>
        )}

        {/* Runtime error alert */}
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <form action={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="student-email"
            className="text-sm font-semibold text-ink-2"
          >
            Email address
          </label>
          <input
            id="student-email"
            name="email"
            type="email"
            required
            autoFocus
            placeholder="you@university.edu"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-eu-blue/50 disabled:pointer-events-none disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-eu-blue px-5 text-sm font-semibold text-white transition-all duration-200 hover:bg-eu-blue-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,51,153,0.25)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2"
          style={{ minHeight: '44px' }}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            'Send sign-in link'
          )}
        </button>
      </form>

      {/* D-03 cross-link — coordinator entry point */}
      <p className="mt-2 text-center text-sm text-muted">
        Are you a university coordinator?{' '}
        <Link href="/login" className="text-eu-blue font-semibold hover:underline">
          Sign in here →
        </Link>
      </p>
    </div>
  )
}
