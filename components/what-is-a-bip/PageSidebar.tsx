'use client'

/**
 * PageSidebar — shared "On this page" rail (used by /about, /privacy, /terms).
 *
 * Visual concept (after rebuild 2026-05-16):
 *   - Numbered badges (01–0N) for each section, connected vertically by a
 *     faint gray rail.
 *   - Active badge fills gold with a soft glow shadow and scales up.
 *   - Active label switches to bold ink. Inactive labels stay muted.
 *   - Smooth 300ms transitions on color / transform / shadow.
 *
 * IntersectionObserver tracks whichever section is currently inside the
 * top-30%-of-viewport trigger zone; the active item walks down as the
 * user scrolls.
 *
 * The number badges are decorative (`aria-hidden`); each link gets
 * `aria-current="location"` when active for assistive tech.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils/cn'

interface Section {
  id: string
  label: string
}

interface PageSidebarProps {
  sections: readonly Section[]
}

export function PageSidebar({ sections }: PageSidebarProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)

    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          )
        if (visible[0]) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="Page sections" className="sticky top-24">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        On this page
      </p>
      <ol className="relative flex flex-col">
        {sections.map((s, i) => {
          const active = s.id === activeId
          const isLast = i === sections.length - 1
          const ordinal = String(i + 1).padStart(2, '0')

          return (
            <li key={s.id} className="relative flex items-start gap-3 pb-6 last:pb-0">
              {/* Connecting rail between badges (skip on last item) */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[13px] top-7 -z-0 w-px"
                  style={{
                    height: 'calc(100% - 16px)',
                    background:
                      'linear-gradient(to bottom, var(--color-eu-blue-100), var(--color-eu-blue-100))',
                  }}
                />
              )}

              {/* Numbered badge */}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums transition-all duration-300 ease-out',
                  active
                    ? 'scale-110 border-eu-gold bg-eu-gold text-ink shadow-[0_4px_14px_rgba(255,204,0,0.45)]'
                    : 'border-eu-blue-100 bg-white text-muted group-hover/item:border-eu-blue/40',
                )}
              >
                {ordinal}
              </span>

              {/* Label */}
              <a
                href={`#${s.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'group/item relative block flex-1 pt-1 pr-2 text-[13.5px] leading-snug transition-all duration-200',
                  active
                    ? 'font-semibold text-ink'
                    : 'text-muted hover:text-eu-blue',
                )}
              >
                {s.label}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
