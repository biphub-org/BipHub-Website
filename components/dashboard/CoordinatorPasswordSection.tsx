'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { sendOwnPasswordResetAction } from '@/lib/actions/auth'

/**
 * Coordinator self-service password reset (settings page).
 *
 * No approval request: one click emails a plain Supabase recovery link to
 * the coordinator's own login email (recipient fixed server-side from
 * claims). The link lands on the shared /reset-password/update flow, which
 * redirects back to /dashboard.
 */
export function CoordinatorPasswordSection({ accountEmail }: { accountEmail: string }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  function handleSend() {
    setMessage(null)
    startTransition(async () => {
      const result = await sendOwnPasswordResetAction()
      if (result?.error) {
        setMessage({ kind: 'error', text: result.error })
        return
      }
      setMessage({
        kind: 'ok',
        text: `Reset link sent to ${accountEmail || 'your email'} — check your inbox (and spam folder).`,
      })
    })
  }

  return (
    <div>
      <p className="text-sm text-muted">
        We&apos;ll email a password-reset link to{' '}
        <span className="font-medium text-ink">{accountEmail || 'your login email'}</span>.
        No approval needed — the link works immediately.
      </p>
      <div className="mt-4">
        <Button type="button" variant="primary" disabled={isPending} onClick={handleSend}>
          {isPending ? 'Sending…' : 'Email me a reset link'}
        </Button>
      </div>
      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-sm font-medium ${
            message.kind === 'error' ? 'text-red-700' : 'text-green-800'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
