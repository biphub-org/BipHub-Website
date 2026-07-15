'use client'

/**
 * CategoriesBar — DISC-03, UI-SPEC line 328.
 *
 * 6-column grid on desktop (12 fields over 2 rows), narrowing to 2 on mobile.
 * Each card links to /bips?field={isced.id}.
 * Icon square flips from bg-eu-blue-50 to bg-eu-gold on hover.
 *
 * Receives countsByField from the RSC parent as a prop — no client-side fetching.
 */

import { useRef } from 'react'
import Link from 'next/link'
import {
  IconDental,
  IconStethoscope,
  IconGavel,
  IconBriefcase,
  IconRun,
  IconPalette,
  IconCpu,
  IconBuildingArch,
  IconSchool,
  IconMessages,
  IconHeartbeat,
  IconUsers,
} from '@tabler/icons-react'
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  type Transition,
  type Variants,
} from 'motion/react'
import { ISCED_FIELDS } from '@/lib/isced'
import { cn } from '@/lib/utils/cn'
import { Eyebrow } from './Eyebrow'
import type { IscedFieldId } from '@/lib/isced'

const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
}

/**
 * Field → Tabler icon mapping.
 * Icons chosen to semantically match each field of study.
 * Static object — no template literals (Pitfall 13).
 */
const ISCED_ICONS: Record<IscedFieldId, React.ComponentType<{ size?: number; className?: string }>> = {
  'dentistry':          IconDental,
  'medicine':           IconStethoscope,
  'law':                IconGavel,
  'business-economics': IconBriefcase,
  'sports':             IconRun,
  'arts-design':        IconPalette,
  'it-engineering':     IconCpu,
  'architecture':       IconBuildingArch,
  'education':          IconSchool,
  'communication':      IconMessages,
  'health-sciences':    IconHeartbeat,
  'social-sciences':    IconUsers,
}

interface CategoriesBarProps {
  countsByField: Record<string, number>
}

export function CategoriesBar({ countsByField }: CategoriesBarProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.2 })

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={sectionRef}
          className="relative overflow-hidden border-b border-border bg-white py-20 md:py-24"
          style={{
            // Faint blue dot grid — the inverse of the dark hero's white grid.
            // Reads as "textured surface" not "decorated."
            backgroundImage:
              'radial-gradient(rgba(0, 51, 153, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
            {/* Section header — promoted from a tiny h3 to a full eyebrow +
                clamp title so it matches the rhythm of every other section. */}
            <m.div
              className="mb-10 flex flex-wrap items-end justify-between gap-4"
              variants={headerVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              <div>
                <Eyebrow className="mb-3">By field of study</Eyebrow>
                <h2
                  className="font-bold text-ink"
                  style={{
                    fontSize: 'clamp(28px, 3.4vw, 38px)',
                    lineHeight: '1.15',
                    letterSpacing: '-0.8px',
                  }}
                >
                  Find programmes in your discipline
                </h2>
              </div>
              <Link
                href="/bips"
                className="text-sm font-semibold text-eu-blue hover:text-eu-blue-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2 rounded-sm"
              >
                Browse all →
              </Link>
            </m.div>

            {/* 6-column grid desktop (12 fields → 2 rows), down to 2 on mobile */}
            <m.div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
              variants={gridVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              {ISCED_FIELDS.map((field) => {
                const Icon = ISCED_ICONS[field.id]
                const count = countsByField[field.id] ?? 0
                return (
                  <m.div key={field.id} variants={cardVariants}>
                    <CategoryCard
                      id={field.id}
                      label={field.label}
                      count={count}
                      Icon={Icon}
                    />
                  </m.div>
                )
              })}
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  )
}

interface CategoryCardProps {
  id: string
  label: string
  count: number
  Icon: React.ComponentType<{ size?: number; className?: string }>
}

function CategoryCard({ id, label, count, Icon }: CategoryCardProps) {
  return (
    <Link
      href={`/bips?field=${id}`}
      className={cn(
        'group block h-full rounded-md border border-border p-4 text-center',
        'transition-all duration-200 ease-out',
        'hover:border-eu-blue hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,51,153,0.12)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
      )}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Icon square — flips blue to gold + tiny rotate on hover */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md',
            'bg-eu-blue-50 text-eu-blue',
            'transition-[background-color,color,transform] duration-200 ease-out',
            'group-hover:bg-eu-gold group-hover:text-ink group-hover:-rotate-6 group-hover:scale-110',
          )}
        >
          <Icon size={20} aria-hidden="true" />
        </div>

        {/* Label */}
        <span className="text-[13px] font-500 leading-tight text-ink-2 group-hover:text-ink transition-colors">
          {label}
        </span>

        {/* Count */}
        <span className="text-[12px] text-muted group-hover:text-eu-blue transition-colors">
          {count}
        </span>
      </div>
    </Link>
  )
}
