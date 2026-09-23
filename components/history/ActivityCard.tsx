import { activityActionLabel } from '@/lib/history/labels'
import { formatLongDate } from '@/lib/utils/dates'
import type { ActivityRow } from '@/lib/queries/activityLog'

/**
 * ActivityCard — one people-activity entry (admin history tabs + per-user
 * trails). Cards everywhere, no tables: person, actor, date, and a compact
 * detail line derived from the entry metadata.
 *
 * Identity survives deletion via snapshots: when the user row is gone,
 * target_name/target_email still read from the log; otherwise the card
 * reads "Deleted user".
 */
function personLabel(entry: ActivityRow): string {
  const name = entry.target_name?.trim()
  const email = entry.target_email?.trim()
  if (name && email) return `${name} · ${email}`
  return name || email || 'Deleted user'
}

function detailLine(entry: ActivityRow): string | null {
  const meta = entry.metadata ?? {}
  switch (entry.action) {
    case 'account_created':
    case 'account_deleted': {
      const role = typeof meta.role === 'string' ? meta.role : null
      const self = entry.action === 'account_deleted' && meta.deleted_by_self === true
      if (role && self) return `${role} · self-deleted`
      return role ?? (self ? 'self-deleted' : null)
    }
    case 'student_profile_updated': {
      const changes = Array.isArray(meta.changes) ? meta.changes : []
      if (changes.length > 0) {
        const labels = changes
          .map((c) => (c && typeof c === 'object' && 'label' in c ? String((c as { label: unknown }).label) : null))
          .filter(Boolean)
        return labels.length > 0
          ? `Changed: ${labels.join(', ')}`
          : `${changes.length} field${changes.length === 1 ? '' : 's'} changed`
      }
      return null
    }
    case 'alerts_subscribed':
    case 'alerts_updated': {
      const parts: string[] = []
      if (Array.isArray(meta.fields) && meta.fields.length > 0) {
        parts.push(`fields: ${meta.fields.join(', ')}`)
      }
      if (Array.isArray(meta.countries) && meta.countries.length > 0) {
        parts.push(`countries: ${meta.countries.join(', ')}`)
      }
      if (typeof meta.frequency === 'string') {
        parts.push(meta.frequency)
      }
      return parts.length > 0 ? parts.join(' · ') : null
    }
    default:
      return null
  }
}

export function ActivityCard({ entry }: { entry: ActivityRow }) {
  const date = formatLongDate(entry.created_at) ?? entry.created_at
  const detail = detailLine(entry)

  return (
    <div className="rounded-md border border-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold text-ink">{activityActionLabel(entry.action)}</p>
        <time className="text-xs text-muted">{date}</time>
      </div>
      <p className="mt-1 text-sm text-ink-2">{personLabel(entry)}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
      {entry.actor_name && entry.actor_id !== entry.target_user_id ? (
        <p className="mt-1 text-xs text-muted">by {entry.actor_name}</p>
      ) : null}
    </div>
  )
}
