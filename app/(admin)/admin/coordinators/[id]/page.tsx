import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, Building2, Calendar, Layers, Hash } from 'lucide-react'
import { getAdminCoordinatorById } from '@/lib/queries/adminCoordinators'
import { createClient } from '@/lib/supabase/server'
import { AdminBipRow } from '@/components/admin/AdminBipRow'
import type { AdminBip } from '@/lib/queries/adminBips'

export const dynamic = 'force-dynamic'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export default async function CoordinatorDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const coordinator = await getAdminCoordinatorById(id)
  if (!coordinator) notFound()

  // Fetch BIPs owned by this coordinator (admin can see all statuses)
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bips')
    .select(
      `id, slug, title, status, host_city, physical_start_date, physical_end_date, created_at, updated_at,
       host_university:host_university_id ( id, name, country ),
       coordinator:profiles!created_by ( full_name, university:university_id ( name ) )`,
    )
    .eq('created_by', id)
    .order('updated_at', { ascending: false })
    .limit(100)

  const bips: AdminBip[] = !error && data
    ? (data as unknown as Array<{
        id: string
        slug: string
        title: string
        status: string
        host_city: string | null
        physical_start_date: string | null
        physical_end_date: string | null
        created_at: string
        updated_at: string
        host_university: { id: string; name: string; country: string } | { id: string; name: string; country: string }[] | null
        coordinator: { full_name: string | null; university: { name: string } | { name: string }[] | null } | { full_name: string | null; university: { name: string } | { name: string }[] | null }[] | null
      }>).map((row) => {
        const host = Array.isArray(row.host_university) ? row.host_university[0] ?? null : row.host_university ?? null
        const coordRaw = Array.isArray(row.coordinator) ? row.coordinator[0] ?? null : row.coordinator
        const uniRaw = coordRaw?.university ?? null
        const uni = Array.isArray(uniRaw) ? uniRaw[0] ?? null : uniRaw
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status as AdminBip['status'],
          host_city: row.host_city,
          physical_start_date: row.physical_start_date,
          physical_end_date: row.physical_end_date,
          created_at: row.created_at,
          updated_at: row.updated_at,
          host_university: host,
          coordinator_name: coordRaw?.full_name ?? null,
          coordinator_university: uni?.name ?? null,
        }
      })
    : []

  const uni = coordinator.university

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <Link href="/admin/coordinators" className="inline-flex items-center gap-1.5 text-sm text-eu-blue hover:underline mb-4">
        <ArrowLeft size={14} aria-hidden />
        Back to coordinators
      </Link>

      <div className="rounded-md border border-border bg-white p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-eu-blue-50 text-sm font-bold text-eu-blue">
            {(coordinator.full_name?.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || coordinator.contact_email?.slice(0, 2).toUpperCase() || '··')}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold text-ink truncate">{coordinator.full_name || 'Unnamed coordinator'}</h1>
            <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted">
              {coordinator.contact_email && (
                <span className="flex items-center gap-2">
                  <Mail size={14} className="opacity-60" aria-hidden />
                  <a href={`mailto:${coordinator.contact_email}`} className="text-eu-blue hover:underline">
                    {coordinator.contact_email}
                  </a>
                </span>
              )}
              {uni ? (
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="opacity-60" aria-hidden />
                  {uni.name} · {uni.country}
                </span>
              ) : (
                <span className="text-muted">No university linked</span>
              )}
              {coordinator.erasmus_code && (
                <span className="flex items-center gap-2">
                  <Hash size={14} className="opacity-60" aria-hidden />
                  <span className="font-mono text-xs bg-bg-soft px-1.5 py-0.5 rounded">{coordinator.erasmus_code}</span>
                </span>
              )}
              <span className="flex items-center gap-2">
                <Calendar size={14} className="opacity-60" aria-hidden />
                Joined {formatDate(coordinator.created_at)}
              </span>
              <span className="flex items-center gap-2">
                <Layers size={14} className="opacity-60" aria-hidden />
                {coordinator.bipCount} BIP{coordinator.bipCount === 1 ? '' : 's'} submitted
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-ink mb-3">
        BIPs by this coordinator {bips.length > 0 ? `(${bips.length})` : ''}
      </h2>

      {bips.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-bg-soft px-6 py-10 text-center">
          <p className="text-sm text-muted">No BIPs submitted yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bips.map((bip) => (
            <AdminBipRow key={bip.id} bip={bip} />
          ))}
        </div>
      )}
    </div>
  )
}
