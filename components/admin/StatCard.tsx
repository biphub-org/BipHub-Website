/**
 * StatCard — generic admin analytics card (D-20 / ADMN-07 /
 * 03-UI-SPEC.md Analytics Contract).
 *
 * Layout: 40px gold-soft icon tile, uppercase eyebrow label, large
 * clamp()-sized value, muted description. RSC-compatible — no client
 * state, no event handlers.
 *
 * "Cards everywhere, no tables" (CLAUDE.md): per-stat card, not a row
 * in a data grid.
 */

import type { ComponentType, SVGProps } from 'react'

interface Props {
  label: string
  value: number
  description: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const VALUE_FORMAT = new Intl.NumberFormat('en-GB')

export function StatCard({ label, value, description, Icon }: Props) {
  return (
    <article className="rounded-md border border-border bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-eu-gold-soft">
        <Icon className="text-eu-gold-dark" width={20} height={20} aria-hidden />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-ink-2">
        {label}
      </p>
      <p
        className="mt-2 font-bold leading-tight text-ink"
        style={{ fontSize: 'clamp(36px, 4vw, 48px)' }}
      >
        {VALUE_FORMAT.format(value)}
      </p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </article>
  )
}
