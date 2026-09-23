'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Calendar, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  approveProfileChangeRequestAction,
  declineProfileChangeRequestAction,
  deleteProfileChangeRequestAction,
} from '@/app/(admin)/admin/coordinators/data-changes/actions'
import type { AdminProfileChangeRequest } from '@/lib/queries/profileChangeRequests'

/**
 * One coordinator data-change request: current → requested diff + Approve /
 * Decline. The optional note is stored as admin_note and emailed to the
 * coordinator with the verdict (it is the only explanation a declined
 * coordinator receives, so declining without a reason is discouraged by the
 * placeholder, not blocked).
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
  declined: 'bg-red-100 text-red-900',
}

function DiffRow({
  label,
  current,
  requested,
}: {
  label: string
  current: string | null
  requested: string | null
}) {
  const changed = (current ?? '') !== (requested ?? '')
  // Unchanged fields are not a diff: render the value plainly, with no
  // strikethrough "before" and no arrow.
  if (!changed) {
    return (
      <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
        <dt className="w-32 shrink-0 text-muted">{label}</dt>
        <dd className="min-w-0 text-ink">{requested || '—'}</dd>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0">
        <span className="text-muted line-through decoration-red-300">
          {current || '—'}
        </span>{' '}
        <span aria-hidden>→</span>{' '}
        <span className="font-semibold text-ink">{requested || '—'}</span>
      </dd>
    </div>
  )
}

export function ProfileChangeRequestCard({
  request,
}: {
  request: AdminProfileChangeRequest
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isLive = request.status === 'pending'

  function run(action: (id: string, note?: string) => Promise<{ error?: string; success?: true }>) {
    setError(null)
    startTransition(async () => {
      const result = await action(request.id, note.trim() || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDecline() {
    if (
      !window.confirm(
        `Decline the data-change request from ${request.coordinator_email ?? request.requested_contact_email}? Their profile stays unchanged.`,
      )
    ) {
      return
    }
    run(declineProfileChangeRequestAction)
  }

  function handleDelete() {
    if (
      !window.confirm(
        `Delete this decided data-change request? The audit history keeps the record.`,
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await deleteProfileChangeRequestAction(request.id)
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
          <h2 className="text-base font-semibold text-ink">
            <Link
              href={`/admin/coordinators/${request.coordinator_id}`}
              className="hover:underline"
            >
              {request.current_full_name ?? request.requested_full_name}
            </Link>
          </h2>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            {(request.coordinator_email ?? request.requested_contact_email) && (
              <span className="flex items-center gap-2">
                <Mail size={14} className="opacity-60" aria-hidden />
                {request.coordinator_email ?? request.requested_contact_email}
              </span>
            )}
            {request.current_university && (
              <span className="flex items-center gap-2">
                <Building2 size={14} className="opacity-60" aria-hidden />
                {request.current_university.name} · {request.current_university.country}
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

      <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        <DiffRow
          label="Full name"
          current={request.current_full_name}
          requested={request.requested_full_name}
        />
        <DiffRow
          label="Contact email"
          current={request.current_contact_email}
          requested={request.requested_contact_email}
        />
        <DiffRow
          label="University"
          current={
            request.current_university
              ? `${request.current_university.name} · ${request.current_university.country}`
              : null
          }
          requested={
            request.requested_university
              ? `${request.requested_university.name} · ${request.requested_university.country}`
              : null
          }
        />
        <DiffRow
          label="Erasmus code"
          current={request.current_erasmus_code}
          requested={request.requested_erasmus_code}
        />
      </dl>

      {request.admin_note && (
        <p className="mt-3 rounded-md bg-bg-soft px-3 py-2 text-sm text-ink-2">
          Admin note: {request.admin_note}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {isLive && (
        <div className="mt-4 space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note to the coordinator (optional for approval — this is the only explanation a declined coordinator receives)"
            rows={2}
            maxLength={500}
            aria-label="Note to the coordinator"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={() => run(approveProfileChangeRequestAction)}
            >
              {isPending ? 'Working…' : 'Approve → apply to profile'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="bg-white"
              disabled={isPending}
              onClick={handleDecline}
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {!isLive && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={handleDelete}
          >
            {isPending ? 'Working…' : 'Delete'}
          </Button>
        </div>
      )}
    </article>
  )
}
