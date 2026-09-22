import Link from 'next/link'
import { Calendar, Mail } from 'lucide-react'
import type { StudentProfileChange } from '@/lib/queries/studentProfileChanges'
import { MarkStudentChangeReadButton } from './MarkStudentChangeReadButton'

/**
 * One student profile edit: student identity + before → after per changed
 * field. Student edits apply immediately, so there is nothing to approve or
 * decline — "Mark as read" dismisses the notification (the audit row stays
 * as history).
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

export function StudentProfileChangeCard({
  change,
}: {
  change: StudentProfileChange
}) {
  return (
    <article className="rounded-md border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">
            <Link
              href={`/admin/students/${change.studentId}`}
              className="hover:underline"
            >
              {change.studentName ?? 'Unnamed student'}
            </Link>
          </h3>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
            {change.studentEmail && (
              <span className="flex items-center gap-2">
                <Mail size={14} className="opacity-60" aria-hidden />
                {change.studentEmail}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar size={14} className="opacity-60" aria-hidden />
              Edited {formatDate(change.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        {change.changes.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
          >
            <dt className="w-32 shrink-0 text-muted">{field.label}</dt>
            <dd className="min-w-0">
              <span className="text-muted line-through decoration-red-300">
                {field.before || '—'}
              </span>{' '}
              <span aria-hidden>→</span>{' '}
              <span className="font-semibold text-ink">
                {field.after || '—'}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex justify-end">
        <MarkStudentChangeReadButton changeId={change.id} />
      </div>
    </article>
  )
}
