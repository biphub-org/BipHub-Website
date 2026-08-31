/**
 * /about — static About page (RSC).
 *
 * Tells the story of why BipHub exists: BIP discovery was previously trapped
 * in a broken sortable table on a third-party site, with no map, no filters,
 * no search, no per-programme detail pages. BipHub replaces that with a
 * proper directory, free, open source, and built in the open.
 *
 * Mirrors the visual rhythm of the homepage: hero band, then alternating
 * content sections inside a max-w-[1100px] grid.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'About BipHub · The open Erasmus+ BIP directory',
  description:
    'BipHub is a free, open-source directory of Erasmus+ Blended Intensive Programmes — built to make BIPs as easy to discover as any other study abroad option.',
  alternates: { canonical: 'https://biphub.eu/about' },
}

export default function AboutPage() {
  return (
    <>
      {/* Hero band */}
      <section className="bg-bg-soft border-b border-border py-16 lg:py-24">
        <div className="container mx-auto max-w-[1100px] px-4 lg:px-6">
          <Eyebrow className="mb-3">About the project</Eyebrow>
          <h1
            className="font-bold text-ink"
            style={{
              fontSize: 'clamp(34px, 5vw, 52px)',
              lineHeight: '1.1',
              letterSpacing: '-1.5px',
            }}
          >
            A proper home for Erasmus+ Blended Intensive Programmes.
          </h1>
          <p className="mt-6 max-w-[65ch] text-[18px] leading-relaxed text-muted">
            BipHub is a free, open-source directory of Erasmus+ Blended
            Intensive Programmes across Europe — built to make BIPs as easy to
            discover as any other study-abroad option. No accounts to browse,
            no paywalls, no tracking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary">
              <Link href="/bips">Browse all BIPs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/what-is-a-bip">What is a BIP?</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-[1100px] px-4 lg:px-6 py-16 lg:py-24">
        {/* Why */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-16">
          <div>
            <Eyebrow className="mb-3">Why we built it</Eyebrow>
            <h2 className="text-[clamp(26px,3vw,34px)] font-bold tracking-tight text-ink">
              Discovery should not be a sortable table.
            </h2>
          </div>
          <div className="text-ink-2 leading-relaxed space-y-4">
            <p>
              BIPs are one of the best things the Erasmus+ programme does: a
              5&ndash;10 day intensive abroad, plus a virtual component, worth
              3&ndash;6 ECTS, for any student at any participating institution.
              They are short, affordable, and exactly the kind of experience
              students who cannot commit to a full semester are looking for.
            </p>
            <p>
              The problem is finding them. Until now, the most complete public
              list lived inside a broken third-party sortable table — no map,
              no filters, no search, no detail pages, and no way to share a
              specific programme with a friend or your Erasmus office. We
              thought students and coordinators deserved better.
            </p>
            <p>
              So we built BipHub: a real directory with a country map,
              accent-aware full-text search, sensible filters, shareable URLs,
              proper detail pages, and bookmarks that work without an account.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-16">
          <div>
            <Eyebrow className="mb-3">How we operate</Eyebrow>
            <h2 className="text-[clamp(26px,3vw,34px)] font-bold tracking-tight text-ink">
              A few principles we will not compromise on.
            </h2>
          </div>
          <div className="space-y-6">
            <Principle
              title="Free and open source"
              body="The full source code is on GitHub under the MIT licence. Anyone can fork it, audit it, or contribute a fix. There is no paid tier and there will not be one."
            />
            <Principle
              title="No tracking, no ads"
              body="We run zero analytics scripts, no third-party trackers, and no advertising pixels. The cheapest GDPR-compliant path is to collect nothing — so we collect nothing."
            />
            <Principle
              title="Independent of the European Commission"
              body="The Erasmus+ name and palette are descriptive. BipHub is not affiliated with, endorsed by, or officially connected to the European Commission, the National Agencies, or any participating university."
            />
            <Principle
              title="Universities own their content"
              body="Coordinators publish their own programmes through a self-service submission flow with admin review. They can edit or withdraw their listings at any time."
            />
          </div>
        </section>

        {/* For coordinators */}
        <section className="mt-20 rounded-2xl border border-border bg-bg-soft p-8 lg:p-12">
          <Eyebrow className="mb-3">For university coordinators</Eyebrow>
          <h2 className="text-[clamp(26px,3vw,34px)] font-bold tracking-tight text-ink">
            List your BIP in a few minutes.
          </h2>
          <p className="mt-4 max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
            Self-service submission, draft autosave, a single-screen preview,
            and admin review before anything goes live. Approved listings are
            instantly searchable, filterable, and bookmarkable for thousands of
            students across Europe.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary">
              <Link href="/register/coordinator">List your BIP</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Open source */}
        <section className="mt-20 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-16">
          <div>
            <Eyebrow className="mb-3">Contribute</Eyebrow>
            <h2 className="text-[clamp(26px,3vw,34px)] font-bold tracking-tight text-ink">
              Built in the open.
            </h2>
          </div>
          <div className="text-ink-2 leading-relaxed space-y-4">
            <p>
              BipHub is a Next.js + Supabase application maintained by Hexona
              Systems and external contributors. Issues, pull requests, and
              fixes are welcome through the GitHub repository — see{' '}
              <code>CONTRIBUTING.md</code> for setup instructions and the
              project conventions.
            </p>
            <p>
              For anything else — partnership questions, data corrections, or
              feedback &mdash; reach us at{' '}
              <a
                href="mailto:biphub.org@gmail.com"
                className="text-eu-blue underline"
              >
                biphub.org@gmail.com
              </a>
              .
            </p>
            <p className="pt-2">
              <a
                href="https://github.com/biphub/biphub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-eu-blue hover:underline"
              >
                Source on GitHub →
              </a>
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
      <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{body}</p>
    </div>
  )
}
