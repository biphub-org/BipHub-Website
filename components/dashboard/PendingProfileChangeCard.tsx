'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { withdrawProfileChangeRequestAction } from '@/lib/actions/coordinator-profile-change'
import type { MyProfileChangeRequest } from '@/lib/queries/profileChangeRequests'

/**
 * Pending data-change request card (/dashboard/settings).
 *
 * Shows the requested values while the admin verdict is outstanding. The
 * coordinator can withdraw the request (DELETE own pending) to fix a typo
 * and re-file — otherwise the one-live-request rule would strand them.
 */

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function PendingProfileChangeCard({
  request,
}: {
  request: MyProfileChangeRequest
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleWithdraw() {
    if (
      !window.confirm(
        'Withdraw this data-change request? Your profile stays as it is, and you can file a new request.',
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await withdrawProfileChangeRequestAction(request.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const uni = request.requested_university

  return (
    <article className="rounded-md border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Clock size={16} className="text-amber-700" aria-hidden />
        Request under review
      </h3>
      <p className="mt-1 text-sm text-muted">
        Sent {formatDate(request.created_at)}. Your current details stay live
        until an admin approves.
      </p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="w-32 shrink-0 text-muted">Full name</dt>
          <dd className="font-medium text-ink">{request.requested_full_name}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="w-32 shrink-0 text-muted">Contact email</dt>
          <dd className="font-medium text-ink">{request.requested_contact_email}</dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="w-32 shrink-0 text-muted">University</dt>
          <dd className="font-medium text-ink">
            {uni ? `${uni.name} · ${uni.country}` : '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="w-32 shrink-0 text-muted">Erasmus code</dt>
          <dd className="font-medium text-ink">{request.requested_erasmus_code ?? '—'}</dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          disabled={isPending}
          onClick={handleWithdraw}
        >
          {isPending ? 'Withdrawing…' : 'Withdraw request'}
        </Button>
      </div>
    </article>
  )
}
