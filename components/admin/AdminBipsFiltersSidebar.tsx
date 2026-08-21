'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import {
  Calendar,
  Clock,
  Globe,
  GraduationCap,
  Languages,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ISCED_FIELDS } from '@/lib/isced'
import { ERASMUS_COUNTRIES } from '@/lib/countries'

/** Reused from BipFiltersSidebar — gold dot when section has active filter */
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
      <Icon size={15} strokeWidth={1.9} className="shrink-0 text-eu-blue/70" aria-hidden="true" />
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

const AVAILABILITY_OPTIONS = ['open', 'closed', 'any'] as const
const STUDY_LEVELS = ['bachelor', 'master', 'phd'] as const

export type AdminFullFilterState = {
  country?: string[]
  field?: string[]
  lang?: string[]
  dateFrom?: string
  dateTo?: string
  availability?: 'open' | 'closed' | 'any'
  level?: string[]
  partnerOnly?: 'exclude' | 'only'
}

interface Props {
  filters: AdminFullFilterState
  basePath: string // e.g. '/admin/bips' or '/admin/my-bips'
}

export function AdminBipsFiltersSidebar({ filters, basePath }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    next.delete('page')
    startTransition(() => {
      router.push(next.toString() ? `${basePath}?${next}` : basePath)
    })
  }

  const toggleArray = (key: string, value: string, current: string[] | undefined) => {
    const set = new Set(current ?? [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    update(key, set.size === 0 ? undefined : Array.from(set).join(','))
  }

  const sectionActive = {
    country: (filters.country?.length ?? 0) > 0,
    field: (filters.field?.length ?? 0) > 0,
    lang: (filters.lang?.length ?? 0) > 0,
    dates: Boolean(filters.dateFrom || filters.dateTo),
    availability: Boolean(filters.availability && filters.availability !== 'any'),
    level: (filters.level?.length ?? 0) > 0,
    partnerOnly: !!filters.partnerOnly,
  } as const

  const activeCount =
    (filters.country?.length ?? 0) +
    (filters.field?.length ?? 0) +
    (filters.lang?.length ?? 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.availability && filters.availability !== 'any' ? 1 : 0) +
    (filters.level?.length ?? 0) +
    (!!filters.partnerOnly ? 1 : 0)

  const hasActive = activeCount > 0

  return (
    <section role="region" aria-label="Filters" className="sticky top-[88px] max-h-[calc(100vh-100px)] overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-eu-blue-50 text-eu-blue">
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
          <button onClick={() => router.push(basePath)} className="text-xs text-muted hover:text-ink underline">
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
              {[...ERASMUS_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <li key={c.code}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.country?.includes(c.code.toLowerCase()) ?? false}
                      onChange={() => toggleArray('country', c.code.toLowerCase(), filters.country)}
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
              {[...ISCED_FIELDS].sort((a, b) => a.label.localeCompare(b.label)).map((f) => (
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
              {[...LANGS].sort((a, b) => a.label.localeCompare(b.label)).map((l) => (
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

        <AccordionItem value="availability">
          <AccordionTrigger>
            <SectionLabel icon={Clock} label="Availability" active={sectionActive.availability} />
          </AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-2">
              {AVAILABILITY_OPTIONS.map((s) => (
                <li key={s}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="availability"
                      checked={(filters.availability ?? 'any') === s}
                      onChange={() => update('availability', s === 'any' ? undefined : s)}
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

        <AccordionItem value="access">
          <AccordionTrigger>
            <SectionLabel icon={ShieldCheck} label="Access" active={sectionActive.partnerOnly} />
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-start gap-2 cursor-pointer rounded-md border border-transparent px-2 py-1.5 -mx-2 hover:bg-bg-soft transition-colors has-[input:checked]:border-eu-blue/20 has-[input:checked]:bg-eu-blue-50">
                <input
                  type="radio"
                  name="partnerOnly"
                  checked={!filters.partnerOnly}
                  onChange={() => update('partnerOnly', undefined)}
                  className="mt-0.5 w-4 h-4 accent-eu-blue shrink-0"
                />
                <span className="text-sm leading-tight">
                  Show all
                  <span className="block text-xs text-muted font-normal">All programmes, including partner-only.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer rounded-md border border-transparent px-2 py-1.5 -mx-2 hover:bg-bg-soft transition-colors has-[input:checked]:border-eu-blue/20 has-[input:checked]:bg-eu-blue-50">
                <input
                  type="radio"
                  name="partnerOnly"
                  checked={filters.partnerOnly === 'exclude'}
                  onChange={() => update('partnerOnly', 'exclude')}
                  className="mt-0.5 w-4 h-4 accent-eu-blue shrink-0"
                />
                <span className="text-sm leading-tight">
                  Hide partner-only
                  <span className="block text-xs text-muted font-normal">Exclude programmes open only to partner institutions.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer rounded-md border border-transparent px-2 py-1.5 -mx-2 hover:bg-bg-soft transition-colors has-[input:checked]:border-eu-blue/20 has-[input:checked]:bg-eu-blue-50">
                <input
                  type="radio"
                  name="partnerOnly"
                  checked={filters.partnerOnly === 'only'}
                  onChange={() => update('partnerOnly', 'only')}
                  className="mt-0.5 w-4 h-4 accent-eu-blue shrink-0"
                />
                <span className="text-sm leading-tight">
                  Only partner-only
                  <span className="block text-xs text-muted font-normal">Show only programmes for partner institutions.</span>
                </span>
              </label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
