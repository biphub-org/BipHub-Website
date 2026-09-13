/**
 * /coming-soon — public roadmap page for upcoming features (RSC).
 *
 * To announce a feature, replace a card's title/body/status (or add a new
 * entry to UPCOMING). Statuses: 'in-progress' | 'planned'.
 *
 * Shares the /about visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead.
 *  - Cards with rounded-xl border-eu-blue-100 + soft shadow.
 *  - Pure RSC, rendered per request (never force-static — see below).
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'
import { Button } from '@/components/ui/button'
import { CreditCard, FlaskConical, Landmark } from 'lucide-react'

// Per-request rendering (never force-static): the auth-aware (public) layout
// reads session cookies for the nav — force-static would bake the logged-out
// nav into the production prerender (see tests/routing/public-static-guard).

export const metadata: Metadata = {
  title: 'Coming soon · BipHub',
  description:
    'What’s next for BipHub — upcoming features and updates to the Erasmus+ BIP directory.',
  alternates: { canonical: 'https://biphub.eu/coming-soon' },
}

type UpcomingStatus = 'in-progress' | 'planned'

const STATUS_STYLES: Record<UpcomingStatus, string> = {
  'in-progress': 'bg-eu-blue-50 text-eu-blue',
  planned: 'bg-[#fffbeb] text-[#b45309]',
}

const STATUS_LABELS: Record<UpcomingStatus, string> = {
  'in-progress': 'In progress',
  planned: 'Planned',
}

// ── Announced roadmap — keep in sync with /terms (paid plans) and /privacy (analytics/ads) ──
const UPCOMING = [
  {
    id: 'coordinator-plans',
    icon: CreditCard,
    status: 'planned' as UpcomingStatus,
    title: 'Optional paid plans for coordinators',
    body: 'Listing is free today. We are working on optional paid coordinator subscriptions — such as enhanced listing visibility — so BipHub can sustain itself without charging students. Details will appear in the terms before anything launches.',
  },
  {
    id: 'analytics-ads',
    icon: FlaskConical,
    status: 'planned' as UpcomingStatus,
    title: 'Privacy-respecting analytics and advertising',
    body: 'To keep the directory free for students, we plan to introduce privacy-respecting analytics and limited advertising. The privacy policy will be updated — including any consent controls required by law — before anything goes live.',
  },
  {
    id: 'eu-cofunding',
    icon: Landmark,
    status: 'planned' as UpcomingStatus,
    title: 'Pursuing Erasmus+ co-funding',
    body: 'BipHub is an independent project and is not currently EU-funded. We intend to pursue Erasmus+ co-funding so the directory can stay free for students long-term — and we will say so clearly here if that happens.',
  },
] as const

export default function ComingSoonPage() {
  return (
    <>
      {/* === Dark hero — matches /about === */}
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
        <div className="relative mx-auto max-w-[1200px] px-4 md:px-6 pt-[96px] pb-[120px] lg:pt-[128px] lg:pb-[152px]">
          <Eyebrow className="mb-5 text-white">
            <span className="text-white">What’s next</span>
          </Eyebrow>
          <h1
            className="max-w-[20ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            Coming soon <span className="text-eu-gold">to BipHub.</span>
          </h1>
          <p className="mt-6 max-w-[65ch] text-[18px] leading-relaxed text-white/70">
            We’re building BipHub one update at a time. Here’s a peek
            at what’s on the way — including how we plan to sustain the project.
          </p>
        </div>
      </section>

      {/* === Body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <Eyebrow className="mb-3">On the roadmap</Eyebrow>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
          Up next.
        </h2>
        <p className="mt-4 max-w-[70ch] leading-relaxed text-ink-2">
          Plans can shift as we learn from students and coordinators using the site —
          but this is where we’re headed.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {UPCOMING.map(({ id, icon: Icon, status, title, body }) => (
            <div
              key={id}
              className="group flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold ${STATUS_STYLES[status]}`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h3 className="text-[19px] font-bold tracking-tight text-ink">
              Have a feature you’d love to see?
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
              We shape the roadmap around real requests from students and coordinators.
            </p>
          </div>
          <Button variant="primary" size="lg" asChild className="shrink-0">
            <Link href="/contact">Suggest a feature</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
