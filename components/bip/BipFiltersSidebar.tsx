'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import {
  Award,
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Languages,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { ISCED_FIELDS } from '@/lib/isced'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import {
  STATUS_FILTER_OPTIONS,
  STUDY_LEVELS,
  type BipFilterState,
} from '@/lib/filters/parseSearchParams'

/** Visual chrome inside each AccordionTrigger — small section icon, label,
 *  and a gold dot when that section has at least one active filter. */
function SectionLabel({
  icon: Icon,
  label,
  active,
}: {
  icon: typeof Globe
  label: string
  active: boolean
}) {
  return (
    <span className="inline-flex flex-1 items-center gap-2.5 text-left">
      <Icon
        size={15}
        strokeWidth={1.9}
        className="shrink-0 text-eu-blue/70"
        aria-hidden="true"
      />
      <span>{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-eu-gold shadow-[0_0_6px_rgba(255,204,0,0.7)]"
        />
      )}
    </span>
  )
}

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'sv', label: 'Swedish' },
] as const

export function BipFiltersSidebar({ filters }: { filters: BipFilterState }) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    next.delete('page') // reset to page 1 on any filter change
    startTransition(() => {
      router.push(next.toString() ? `/bips?${next}` : '/bips')
    })
  }

  const toggleArray = (key: string, value: string, current: string[] | undefined) => {
    const set = new Set(current ?? [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    update(key, set.size === 0 ? undefined : Array.from(set).join(','))
  }

  // ECTS slider: drag updates local state only (smooth), and we commit both
  // bounds to the URL in a SINGLE navigation on release. Driving router.push on
  // every drag tick (via a URL-controlled value) made the thumb snap back —
  // that was the "slider doesn't drag" bug.
  const [ectsLocal, setEctsLocal] = useState<[number, number]>([
    filters.ectsMin ?? 0,
    filters.ectsMax ?? 30,
  ])
  useEffect(() => {
    setEctsLocal([filters.ectsMin ?? 0, filters.ectsMax ?? 30])
  }, [filters.ectsMin, filters.ectsMax])

  const commitEcts = (min: number, max: number) => {
    const next = new URLSearchParams(params)
    if (min <= 0) next.delete('ectsMin')
    else next.set('ectsMin', String(min))
    if (max >= 30) next.delete('ectsMax')
    else next.set('ectsMax', String(max))
    next.delete('page')
    startTransition(() => {
      router.push(next.toString() ? `/bips?${next}` : '/bips')
    })
  }

  const sectionActive = {
    country: (filters.country?.length ?? 0) > 0,
    field: (filters.field?.length ?? 0) > 0,
    lang: (filters.lang?.length ?? 0) > 0,
    dates: Boolean(filters.dateFrom || filters.dateTo),
    ects: filters.ectsMin !== undefined || filters.ectsMax !== undefined,
    status: Boolean(filters.status && filters.status !== 'any'),
    level: (filters.level?.length ?? 0) > 0,
  } as const

  const activeCount =
    (filters.country?.length ?? 0) +
    (filters.field?.length ?? 0) +
    (filters.lang?.length ?? 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.ectsMin !== undefined ? 1 : 0) +
    (filters.ectsMax !== undefined ? 1 : 0) +
    (filters.status && filters.status !== 'any' ? 1 : 0) +
    (filters.level?.length ?? 0)

  const hasActive = activeCount > 0

  return (
    <section
      role="region"
      aria-label="Filters"
      className="sticky top-[88px] max-h-[calc(100vh-100px)] overflow-y-auto"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-eu-blue-50 text-eu-blue"
          >
            <SlidersHorizontal size={15} strokeWidth={2} />
          </span>
          Filters
          {activeCount > 0 && (
            <span
              aria-label={`${activeCount} active`}
              className="ml-1 inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full bg-eu-gold px-1.5 text-[11px] font-bold leading-none text-ink shadow-[0_2px_6px_rgba(255,204,0,0.45)]"
            >
              {activeCount}
            </span>
          )}
        </h2>
        {hasActive && (
          <button
            onClick={() => router.push('/bips')}
            className="text-xs text-muted hover:text-ink underline"
          >
            Clear all
          </button>
        )}
      </div>

      <Accordion multiple>
        <AccordionItem value="country">
          <AccordionTrigger>
            <SectionLabel icon={Globe} label="Country" active={sectionActive.country} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {[...ERASMUS_COUNTRIES]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <li key={c.code}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          filters.country?.includes(c.code.toLowerCase()) ?? false
                        }
                        onChange={() =>
                          toggleArray(
                            'country',
                            c.code.toLowerCase(),
                            filters.country,
                          )
                        }
                        className="w-4 h-4 accent-eu-blue"
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  </li>
                ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="field">
          <AccordionTrigger>
            <SectionLabel icon={GraduationCap} label="Field of study" active={sectionActive.field} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {[...ISCED_FIELDS]
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((f) => (
                <li key={f.id}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.field?.includes(f.id) ?? false}
                      onChange={() => toggleArray('field', f.id, filters.field)}
                      className="w-4 h-4 accent-eu-blue"
                    />
                    <span className="text-sm">{f.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="language">
          <AccordionTrigger>
            <SectionLabel icon={Languages} label="Language" active={sectionActive.lang} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {[...LANGS]
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((l) => (
                <li key={l.code}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.lang?.includes(l.code) ?? false}
                      onChange={() => toggleArray('lang', l.code, filters.lang)}
                      className="w-4 h-4 accent-eu-blue"
                    />
                    <span className="text-sm">{l.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates">
          <AccordionTrigger>
            <SectionLabel icon={Calendar} label="Mobility dates" active={sectionActive.dates} />
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">From</label>
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(e) => update('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus-visible:ring-2 focus-visible:ring-eu-blue outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">To</label>
                <input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(e) => update('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus-visible:ring-2 focus-visible:ring-eu-blue outline-none"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ects">
          <AccordionTrigger>
            <SectionLabel icon={Award} label="ECTS credits" active={sectionActive.ects} />
          </AccordionTrigger>
          <AccordionContent>
            <Slider
              min={0}
              max={30}
              step={1}
              value={ectsLocal}
              onValueChange={(v) => {
                const arr = Array.isArray(v) ? (v as number[]) : [v as number]
                setEctsLocal([arr[0], arr[1] ?? 30])
              }}
              onValueCommitted={(v) => {
                const arr = Array.isArray(v) ? (v as number[]) : [v as number]
                commitEcts(arr[0], arr[1] ?? 30)
              }}
            />
            <p className="text-xs text-muted mt-2">
              {ectsLocal[0]}–{ectsLocal[1]} ECTS
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="status">
          <AccordionTrigger>
            <SectionLabel icon={Clock} label="Application status" active={sectionActive.status} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {STATUS_FILTER_OPTIONS.map((s) => (
                <li key={s}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={(filters.status ?? 'any') === s}
                      onChange={() => update('status', s === 'any' ? undefined : s)}
                      className="w-4 h-4 accent-eu-blue"
                    />
                    <span className="text-sm capitalize">{s}</span>
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="level">
          <AccordionTrigger>
            <SectionLabel icon={Layers} label="Study level" active={sectionActive.level} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {STUDY_LEVELS.map((l) => (
                <li key={l}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.level?.includes(l) ?? false}
                      onChange={() => toggleArray('level', l, filters.level)}
                      className="w-4 h-4 accent-eu-blue"
                    />
                    <span className="text-sm capitalize">{l}</span>
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
