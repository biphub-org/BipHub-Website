/**
 * /about — static About page (RSC).
 *
 * Shares the /what-is-a-bip visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead + CTA row.
 *  - Article body inside max-w-[1200px] container, 220px sticky TOC sidebar.
 *  - Sections with Eyebrow + h2 (clamp 28-40) + body + visual cards.
 *  - Pure RSC, force-static.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, MapPinned, Bookmark, Share2, Mail, ShieldCheck, Code2, Target, Compass, HeartHandshake } from 'lucide-react'
import { Eyebrow } from '@/components/home/Eyebrow'
import { PageSidebar } from '@/components/what-is-a-bip/PageSidebar'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'About BipHub · The open Erasmus+ BIP directory',
  description:
    'BipHub is a free, open-source directory of Erasmus+ Blended Intensive Programmes — built to make BIPs as easy to discover as any other study abroad option.',
  alternates: { canonical: 'https://biphub.eu/about' },
}

const SECTIONS = [
  { id: 'why', label: 'Why we built it' },
  { id: 'mission', label: 'Our mission' },
  { id: 'principles', label: 'Principles' },
  { id: 'coordinators', label: 'For coordinators' },
  { id: 'open-source', label: 'Built in the open' },
] as const

export default function AboutPage() {
  return (
    <>
      {/* === Dark hero — matches /what-is-a-bip === */}
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
            <span className="text-white">About the project</span>
          </Eyebrow>
          <h1
            className="max-w-[20ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            A proper home for Erasmus+ <span className="text-eu-gold">Blended Intensive Programmes.</span>
          </h1>
          <p className="mt-6 max-w-[65ch] text-[18px] leading-relaxed text-white/70">
            BipHub is a free, open-source directory of Erasmus+ Blended Intensive Programmes across Europe — built to make BIPs as easy to discover as any other study-abroad option. No accounts to browse, no paywalls, no tracking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary" className="bg-white text-ink hover:bg-white/90">
              <Link href="/bips">Browse all BIPs</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white"
            >
              <Link href="/what-is-a-bip">What is a BIP?</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* === Article body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <PageSidebar sections={SECTIONS} />
          </aside>

          <article className="min-w-0">
            {/* Section 1 — Why */}
            <section id="why" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Why we built it</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                Discovery should not be a sortable table.
              </h2>
              <div className="mt-4 max-w-none space-y-4 leading-relaxed text-ink-2">
                <p>
                  BIPs are one of the best things the Erasmus+ programme does: a 5–10 day intensive abroad, plus a virtual component, worth 3–6 ECTS, for any student at any participating institution. They are short, affordable, and exactly the kind of experience students who cannot commit to a full semester are looking for.
                </p>
                <p>
                  The problem is finding them. Until now, the most complete public list lived inside a broken third-party sortable table — no map, no filters, no search, no detail pages, and no way to share a specific programme with a friend or your Erasmus office. We thought students and coordinators deserved better.
                </p>
                <p>
                  So we built BipHub: a real directory with a country map, accent-aware full-text search, sensible filters, shareable URLs, proper detail pages, and bookmarks that work without an account.
                </p>
              </div>

              {/* Visual strip — what we replaced */}
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: MapPinned, label: 'Country map', sub: 'Choropleth + list' },
                  { icon: Search, label: 'Search', sub: 'Accent-aware FTS' },
                  { icon: Bookmark, label: 'Bookmarks', sub: 'No account needed' },
                  { icon: Share2, label: 'Shareable', sub: 'URL = current view' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div
                    key={label}
                    className="group rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
                  >
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div className="text-[14px] font-semibold tracking-tight text-ink">{label}</div>
                    <div className="mt-1 text-[12px] font-medium text-muted">{sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2 — Our mission */}
            <section id="mission" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Our mission</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Every BIP findable. No gatekeeper.</h2>
              <div className="mt-6 rounded-2xl border border-eu-blue-100 bg-white p-8 shadow-[0_4px_16px_rgba(10,23,53,0.06)] lg:p-10">
                <blockquote className="border-l-[3px] border-eu-gold pl-6">
                  <p className="text-[20px] font-medium leading-relaxed tracking-tight text-ink lg:text-[22px]">
                    To make every Erasmus+ Blended Intensive Programme discoverable by any student who could benefit — without a paywall, a tracker, or a permission slip.
                  </p>
                </blockquote>
                <p className="mt-6 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">
                  BIPs are already funded, already running, and already changing semesters into weeks. The missing piece was not another programme, but a directory that treats student attention with the same care the universities put into the programmes themselves.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="group flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
                    <Target size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">Access</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Browse without an account. Save, filter, and share with a URL that actually works. If you can open a browser, you can find a BIP.</p>
                </div>
                <div className="group flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
                    <Compass size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">Clarity</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Real maps, real filters, real detail pages. No sortable-table archaeology. What you see is what the coordinator published.</p>
                </div>
                <div className="group flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
                    <HeartHandshake size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">Trust</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Open-source, no analytics, no ads, no affiliate. Universities own their listings. We just keep the lights on and the search honest.</p>
                </div>
              </div>
            </section>

            {/* Section 3 — Principles */}
            <section id="principles" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">How we operate</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                A few principles we will not compromise on.
              </h2>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                <PrincipleCard
                  icon={Code2}
                  title="Free and open source"
                  body="Published as open source under the MIT licence — free forever and open to community contributions. There is no paid tier and there will not be one."
                />
                <PrincipleCard
                  icon={ShieldCheck}
                  title="No tracking, no ads"
                  body="We run zero analytics scripts, no third-party trackers, and no advertising pixels. The cheapest GDPR-compliant path is to collect nothing — so we collect nothing."
                />
                <PrincipleCard
                  title="Independent of the European Commission"
                  body="The Erasmus+ name and palette are descriptive. BipHub is not affiliated with, endorsed by, or officially connected to the European Commission, the National Agencies, or any participating university."
                />
                <PrincipleCard
                  title="Universities own their content"
                  body="Coordinators publish their own programmes through a self-service submission flow with admin review. They can edit or withdraw their listings at any time."
                />
              </div>
            </section>

            {/* Section 3 — For coordinators (highlight card) */}
            <section id="coordinators" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">For university coordinators</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">List your BIP in a few minutes.</h2>
              <div className="mt-6 rounded-2xl border border-eu-blue-100 bg-eu-blue-50/40 p-8 shadow-[0_4px_16px_rgba(10,23,53,0.06)] lg:p-10">
                <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
                  Self-service submission, draft autosave, a single-screen preview, and admin review before anything goes live. Approved listings are instantly searchable, filterable, and bookmarkable for thousands of students across Europe.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="primary">
                    <Link href="/register/coordinator">List your BIP</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </div>
            </section>

            {/* Section 4 — Built in the open */}
            <section id="open-source" className="mb-16 scroll-mt-24">
              <Eyebrow className="mb-3">Contribute</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Built in the open.</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  BipHub is maintained by Hexona Systems and external contributors. The codebase is open source under the MIT licence — see <code>CONTRIBUTING.md</code> for setup instructions and the project conventions.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Link
                    href="/coming-soon"
                    className="group flex items-center gap-4 rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
                      <Compass size={20} />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-ink group-hover:text-eu-blue">See what&apos;s next</span>
                      <span className="block text-[12px] text-muted">Features on the roadmap</span>
                    </span>
                  </Link>
                  <a
                    href="mailto:biphub.org@gmail.com"
                    className="group flex items-center gap-4 rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
                  >
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                      <Mail size={20} />
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-ink group-hover:text-eu-blue">Contact us</span>
                      <span className="block text-[12px] text-muted">biphub.org@gmail.com</span>
                    </span>
                  </a>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>
    </>
  )
}

function PrincipleCard({ title, body, icon: Icon }: { title: string; body: string; icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }) {
  return (
    <div className="group flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]">
      {Icon && (
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-300 group-hover:bg-eu-blue group-hover:text-white">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      )}
      <h3 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{body}</p>
    </div>
  )
}
