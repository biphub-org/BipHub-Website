'use client'

import Link from 'next/link'
import { Mail, Building2, MapPin, Layers, Calendar } from 'lucide-react'
import type { AdminCoordinator } from '@/lib/queries/adminCoordinators'

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

export function CoordinatorCard({ coordinator }: { coordinator: AdminCoordinator }) {
  const uni = coordinator.university
  const name = coordinator.full_name?.trim() || 'Unnamed coordinator'
  const email = coordinator.contact_email

  return (
    <Link
      href={`/admin/coordinators/${coordinator.id}`}
      className="flex gap-4 rounded-md border border-border bg-white p-4 hover:border-border-strong hover:shadow-sm transition"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-eu-blue-50 text-xs font-bold text-eu-blue">
        {initials(coordinator.full_name, coordinator.contact_email)}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink">{name}</h3>

        <div className="mt-1 flex flex-col gap-1 text-xs text-muted">
          {email && (
            <span className="flex items-center gap-1.5 truncate">
              <Mail size={12} className="shrink-0 opacity-60" aria-hidden />
              <span className="truncate">{email}</span>
            </span>
          )}
          {uni ? (
            <span className="flex items-center gap-1.5 truncate">
              <Building2 size={12} className="shrink-0 opacity-60" aria-hidden />
              <span className="truncate">
                {uni.name} · {uni.country}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 opacity-60" aria-hidden />
              No university linked
            </span>
          )}
          {coordinator.erasmus_code && (
            <span className="flex items-center gap-1.5">
              <span className="inline-flex rounded bg-bg-soft px-1.5 py-0.5 text-[10px] font-mono text-muted">{coordinator.erasmus_code}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-eu-blue-light bg-eu-blue-50 px-2.5 py-1 text-xs font-semibold text-eu-blue">
          <Layers size={12} aria-hidden />
          {coordinator.bipCount} BIP{coordinator.bipCount === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted">
          <Calendar size={11} aria-hidden />
          {formatDate(coordinator.created_at)}
        </span>
      </div>
    </Link>
  )
}
