'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Building2, Hash, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  approveCoordinatorRequestAction,
  rejectCoordinatorRequestAction,
} from '@/app/(admin)/admin/coordinators/requests/actions'
import type { AdminCoordinatorRequest } from '@/lib/queries/adminCoordinatorRequests'

/**
 * One coordinator access request: requester details + Approve / Reject.
 *
 * Server Actions live in ./actions (service-role invite); this card calls
 * them with useTransition and refreshes the list on success. Reject asks
 * for confirmation first — it is visible to the requester on next sign-in.
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

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
}

export function CoordinatorRequestCard({
  request,
}: {
  request: AdminCoordinatorRequest
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isLive = request.status === 'pending'

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const result = await approveCoordinatorRequestAction(request.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleReject() {
    if (
      !window.confirm(
        `Reject the coordinator request from ${request.email}? They will see "not approved" on sign-in.`,
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await rejectCoordinatorRequestAction(request.id)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <article className="rounded-md border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink truncate">
            {request.full_name}
          </h2>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Mail size={14} className="opacity-60" aria-hidden />
              <a
                href={`mailto:${request.email}`}
                className="font-medium text-ink hover:underline"
              >
                {request.email}
              </a>
            </span>
            {request.university ? (
              <span className="flex items-center gap-2">
                <Building2 size={14} className="opacity-60" aria-hidden />
                {request.university.name} · {request.university.country}
              </span>
            ) : (
              <span className="text-muted">No university linked</span>
            )}
            {request.erasmus_code && (
              <span className="flex items-center gap-2">
                <Hash size={14} className="opacity-60" aria-hidden />
                <span className="font-mono text-xs bg-bg-soft px-1.5 py-0.5 rounded">
                  {request.erasmus_code}
                </span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar size={14} className="opacity-60" aria-hidden />
              Requested {formatDate(request.created_at)}
              {request.reviewed_at && ` · Decided ${formatDate(request.reviewed_at)}`}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[request.status] ?? STATUS_PILL.pending}`}
        >
          {request.status}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {isLive && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={handleApprove}
          >
            {isPending ? 'Working…' : 'Approve → send invite'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="bg-white"
            disabled={isPending}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      )}
    </article>
  )
}
