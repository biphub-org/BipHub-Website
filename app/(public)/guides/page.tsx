/**
 * /guides — static hub indexing every entry in lib/content/guides.ts.
 *
 * Grouped by audience (students / coordinators) so visitors can scan to the
 * section relevant to them. Cards link to /guides/<slug>.
 *
 * Layout (post-rebuild 2026-05-16): full-bleed dark hero matches the visual
 * DNA on /what-is-a-bip; guide cards live in the light section below.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Compass, Plane, Wallet } from 'lucide-react'
import { Eyebrow } from '@/components/home/Eyebrow'
import {
  GUIDES,
  TOPICS,
  countGuidesByTopic,
  type Guide,
  type TopicMeta,
} from '@/lib/content/guides'

// Resolves the icon name on TopicMeta to a lucide component.
const TOPIC_ICONS = {
  Compass,
  Wallet,
  Plane,
  Building2,
} as const

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Guides · BipHub',
  description:
    'Practical guides for Erasmus+ BIPs — how to choose a programme, how to apply, and how universities can list their own BIPs.',
  alternates: { canonical: 'https://biphub.eu/guides' },
}

const STUDENT_GUIDES = GUIDES.filter((g) => g.audience === 'students')
const COORDINATOR_GUIDES = GUIDES.filter((g) => g.audience === 'coordinators')

export default function GuidesHubPage() {
  return (
    <>
      {/* === Dark hero band === */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0a1735',
          backgroundImage: [
            'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(0, 51, 153, 0.55) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 50% at 92% 100%, rgba(255, 204, 0, 0.18) 0%, transparent 65%)',
          ].join(', '),
        }}
      >
        {/* Sparse static gold accents — no motion, page is force-static */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-eu-gold"
          style={{ left: '10%', top: '22%', boxShadow: '0 0 10px rgba(255,204,0,0.7)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '82%', top: '18%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '78%', top: '64%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-eu-gold"
          style={{ left: '14%', top: '78%', boxShadow: '0 0 10px rgba(255,204,0,0.7)' }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 md:px-6 pt-[136px] pb-20 lg:pt-[168px] lg:pb-28">
          <Eyebrow className="mb-5 text-white">
            <span className="text-white">Guides</span>
          </Eyebrow>
          <h1
            className="max-w-[20ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            Practical guides to{' '}
            <span className="text-eu-gold">Erasmus+ BIPs</span>.
          </h1>
          <p className="mt-6 max-w-[62ch] text-[18px] leading-relaxed text-white/70">
            Short, opinionated reads — written for the people who actually need
            them, not for search engines. Updated as the programme rules and
            the directory evolve.
          </p>

          {/* Topic tiles — taxonomy preview. Non-clickable in v1: pure
              visual category indicators. Topics without guides yet show
              "Coming soon"; topics with content show their guide count. */}
          <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {TOPICS.map((topic) => (
              <TopicTile key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      </section>

      {/* === Cards body === */}
      <div className="container mx-auto max-w-[1100px] px-4 lg:px-6 py-16 lg:py-24">
        <section className="mb-20">
          <Eyebrow className="mb-3">For students</Eyebrow>
          <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink">
            Find and apply
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {STUDENT_GUIDES.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>

        <section>
          <Eyebrow className="mb-3">For coordinators</Eyebrow>
          <h2 className="mb-8 text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink">
            List and maintain
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {COORDINATOR_GUIDES.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function TopicTile({ topic }: { topic: TopicMeta }) {
  const Icon = TOPIC_ICONS[topic.icon]
  const count = countGuidesByTopic(topic.id)
  const hasContent = count > 0

  return (
    <div
      className={
        hasContent
          ? 'group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-eu-gold/40 hover:bg-white/[0.08] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
          : 'group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.025] p-5 opacity-70 backdrop-blur-sm transition-all duration-300 ease-out hover:border-white/20 hover:bg-white/[0.05] hover:opacity-90'
      }
    >
      {/* Soft gold halo on hover — populated tiles only */}
      {hasContent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-eu-gold/0 opacity-0 blur-2xl transition-all duration-500 group-hover:bg-eu-gold/20 group-hover:opacity-100"
        />
      )}

      <div className="relative flex items-center justify-between">
        <span
          className={
            hasContent
              ? 'inline-flex h-9 w-9 items-center justify-center rounded-md bg-eu-gold/15 text-eu-gold transition-all duration-300 ease-out group-hover:scale-110 group-hover:bg-eu-gold/25 group-hover:shadow-[0_0_16px_rgba(255,204,0,0.4)]'
              : 'inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white/40 transition-colors duration-300 group-hover:bg-white/10 group-hover:text-white/60'
          }
        >
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
        {hasContent ? (
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-eu-gold transition-colors duration-300 group-hover:text-eu-gold">
            {count} {count === 1 ? 'guide' : 'guides'}
          </span>
        ) : (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50 transition-colors duration-300 group-hover:text-white/70">
            Coming soon
          </span>
        )}
      </div>
      <h3
        className={
          hasContent
            ? 'relative text-[16px] font-semibold leading-snug text-white transition-colors duration-300'
            : 'relative text-[16px] font-semibold leading-snug text-white/70 transition-colors duration-300 group-hover:text-white/85'
        }
      >
        {topic.label}
      </h3>
      {!hasContent && (
        <p className="relative text-[13px] leading-snug text-white/50 transition-colors duration-300 group-hover:text-white/65">
          {topic.comingSoon}
        </p>
      )}
    </div>
  )
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group relative flex flex-col rounded-xl border border-eu-blue-100 bg-white p-7 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all hover:-translate-y-0.5 hover:border-eu-blue hover:shadow-[0_8px_24px_rgba(10,23,53,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2"
    >
      <span className="inline-flex w-fit items-center rounded-full bg-eu-blue-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-eu-blue">
        {guide.readingTime}
      </span>
      <h3 className="mt-4 text-[22px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-eu-blue">
        {guide.title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        {guide.summary}
      </p>
      <span
        aria-hidden="true"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-eu-blue transition-transform group-hover:translate-x-0.5"
      >
        Read guide
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  )
}
