import Link from 'next/link'
import { Mail, MapPin, Calendar, Heart, Bell, BellOff } from 'lucide-react'
import { getCountryName } from '@/lib/countries'
import { formatAlertSummary, type AdminStudent } from '@/lib/queries/adminStudents'
import { resolveAdminUserDisplay, type AdminUserAuthDisplay } from '@/lib/auth/admin-user-display'

function initials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('') || '··'
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '··'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export function StudentCard({
  student,
  auth = null,
}: {
  student: AdminStudent
  /**
   * Auth-record display data (signup details). Fills every field the bare
   * profiles row of an unverified user lacks: name, email, country,
   * university. Null when the lookup failed — profile data renders alone.
   */
  auth?: AdminUserAuthDisplay | null
}) {
  const display = resolveAdminUserDisplay({
    kind: 'student',
    profileName: student.fullName,
    authName: auth?.name,
    emailConfirmedAt: auth?.emailConfirmedAt,
  })
  const name = display.name
  const unverified = auth ? display.unverified : false
  const email = student.contactEmail ?? auth?.email ?? null
  const country = student.country ?? auth?.country ?? null
  const university = student.university ?? auth?.university ?? null
  const alerts = student.alerts

  return (
    <Link
      href={`/admin/students/${student.id}`}
      className="flex gap-4 rounded-md border border-border bg-white p-4 hover:border-border-strong hover:shadow-sm transition"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-eu-blue-50 text-xs font-bold text-eu-blue">
        {initials(name === 'Unnamed student' ? null : name, student.contactEmail)}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="truncate">{name}</span>
          {unverified && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
              Unverified
            </span>
          )}
        </h3>

        <div className="mt-1 flex flex-col gap-1 text-xs text-muted">
          {email && (
            <span className="flex items-center gap-1.5 truncate">
              <Mail size={12} className="shrink-0 opacity-60" aria-hidden />
              <span className="truncate">{email}</span>
            </span>
          )}
          {(country || university) && (
            <span className="flex items-center gap-1.5 truncate">
              <MapPin size={12} className="shrink-0 opacity-60" aria-hidden />
              <span className="truncate">
                {country ? getCountryName(country) : 'Country not set'}
                {university ? ` · ${university.name}` : ''}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0 opacity-60" aria-hidden />
            Joined {formatDate(student.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
        {alerts ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-eu-blue-light bg-eu-blue-50 px-2.5 py-1 text-xs font-semibold text-eu-blue">
            <Bell size={12} aria-hidden />
            {formatAlertSummary(alerts)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-soft px-2.5 py-1 text-xs font-medium text-muted">
            <BellOff size={12} aria-hidden />
            No alerts
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          <Heart size={11} aria-hidden />
          {student.savedCount} saved
        </span>
      </div>
    </Link>
  )
}
