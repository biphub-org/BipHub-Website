import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Heart,
  Bell,
  BellOff,
  Globe,
  GraduationCap,
  Hash,
  Repeat,
} from 'lucide-react'
import { getAdminStudentById } from '@/lib/queries/adminStudents'
import { getCountryName } from '@/lib/countries'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'
import { ISCED_CODES } from '@/lib/isced-codes'
import { CountryFlag } from '@/components/ui/country-flag'
import { STATUS_BADGE_CLASSES, STATUS_LABELS, type BipStatus } from '@/lib/utils/status'
import { cn } from '@/lib/utils/cn'

export const dynamic = 'force-dynamic'

const ISCED_LABEL_BY_CODE = new Map<string, string>(ISCED_CODES.map((c) => [c.code, c.label]))

function fieldLabel(id: string): string {
  const entry = (ISCED_FIELD_BY_ID as Record<string, { label: string }>)[id]
  return entry?.label ?? id.replace(/-/g, ' ')
}

function formatDate(iso: string, long = false) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', long
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function isBipStatus(s: string): s is BipStatus {
  return s in STATUS_BADGE_CLASSES
}

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const student = await getAdminStudentById(id)
  if (!student) notFound()

  const alerts = student.alerts
  const frequency = alerts
    ? alerts.frequency.charAt(0).toUpperCase() + alerts.frequency.slice(1)
    : null

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-eu-blue hover:underline mb-4">
        <ArrowLeft size={14} aria-hidden />
        Back to students
      </Link>

      {/* Profile */}
      <div className="rounded-md border border-border bg-white p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-eu-blue-50 text-sm font-bold text-eu-blue">
            {(student.fullName?.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || student.contactEmail?.slice(0, 2).toUpperCase() || '··')}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold text-ink truncate">{student.fullName || 'Unnamed student'}</h1>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
              {student.contactEmail && (
                <span className="flex items-center gap-2">
                  <Mail size={14} className="opacity-60" aria-hidden />
                  <a href={`mailto:${student.contactEmail}`} className="text-eu-blue hover:underline">
                    {student.contactEmail}
                  </a>
                </span>
              )}
              {student.country && (
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="opacity-60" aria-hidden />
                  <CountryFlag code={student.country} width={18} />
                  {getCountryName(student.country)}
                  <span className="text-xs text-muted">{student.country}</span>
                </span>
              )}
              {student.university ? (
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="opacity-60" aria-hidden />
                  {student.university.name} · {student.university.country}
                </span>
              ) : (
                <span className="text-muted">No home university set</span>
              )}
              <span className="flex items-center gap-2">
                <Calendar size={14} className="opacity-60" aria-hidden />
                Joined {formatDate(student.createdAt, true)}
              </span>
              <span className="flex items-center gap-2">
                <Heart size={14} className="opacity-60" aria-hidden />
                {student.savedCount} saved BIP{student.savedCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert preferences */}
      <div className="rounded-md border border-border bg-white p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Bell size={16} className="text-eu-blue" aria-hidden />
            Alert preferences
          </h2>
          {alerts && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-eu-blue-light bg-eu-blue-50 px-3 py-1 text-xs font-semibold text-eu-blue">
              <Repeat size={12} aria-hidden />
              {frequency}
            </span>
          )}
        </div>

        {!alerts ? (
          <div className="flex items-center gap-3 rounded-md bg-bg-soft px-4 py-5">
            <BellOff size={18} className="shrink-0 text-muted" aria-hidden />
            <p className="text-sm text-muted">This student has no alert preferences set.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted">Last updated {formatDate(alerts.updatedAt, true)}</p>

            {alerts.countries.length > 0 && (
              <section aria-label="Alert countries">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-2">
                  <Globe size={14} className="text-eu-blue" aria-hidden />
                  Countries ({alerts.countries.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {alerts.countries.map((code) => (
                    <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-ink">
                      <CountryFlag code={code} width={16} />
                      {getCountryName(code)}
                      <span className="text-muted">{code}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {alerts.fields.length > 0 && (
              <section aria-label="Alert fields of study">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-2">
                  <GraduationCap size={14} className="text-eu-blue" aria-hidden />
                  Fields of study ({alerts.fields.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {alerts.fields.map((f) => (
                    <span key={f} className="inline-flex rounded-sm bg-eu-blue-50 px-2 py-1 text-xs font-medium capitalize text-eu-blue">
                      {fieldLabel(f)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {alerts.iscedCodes.length > 0 && (
              <section aria-label="Alert ISCED codes">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink mb-2">
                  <Hash size={14} className="text-eu-blue" aria-hidden />
                  ISCED codes ({alerts.iscedCodes.length})
                </h3>
                <div className="flex flex-col gap-1.5">
                  {alerts.iscedCodes.map((code) => (
                    <span key={code} className="flex items-baseline gap-2 text-sm">
                      <span className="font-mono text-xs font-semibold text-eu-blue shrink-0">{code}</span>
                      <span className="text-ink">{ISCED_LABEL_BY_CODE.get(code) ?? code}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Saved BIPs */}
      <div className="rounded-md border border-border bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink mb-4">
          <Heart size={16} className="text-eu-blue" aria-hidden />
          Saved BIPs ({student.savedCount})
        </h2>
        {student.savedBips.length === 0 ? (
          <p className="text-sm text-muted">This student hasn&apos;t saved any BIPs yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {student.savedBips.map((bip) => (
              <div key={bip.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                <Link href={`/bip/${bip.slug}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-eu-blue hover:underline">
                  {bip.title}
                </Link>
                {isBipStatus(bip.status) ? (
                  <span className={cn('shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold', STATUS_BADGE_CLASSES[bip.status])}>
                    {STATUS_LABELS[bip.status]}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted">{bip.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
