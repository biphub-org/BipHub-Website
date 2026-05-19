/**
 * /what-is-a-bip — static explainer page (RSC).
 *
 * Implements INFO-01 (BIP explainer covering KA131, virtual component, ECTS,
 * eligibility), INFO-02 (FAQ section with 8 items per Phase 4 D-06), and
 * INFO-04 (outbound link to the official EC Erasmus+ programme guide).
 *
 * Layout (post-rebuild 2026-05-16):
 *   1. Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead + 4-stat strip.
 *   2. Article body inside the container, sidebar TOC anchored to section ids:
 *        - Section 1 (text) — definition
 *        - Section 2 — virtual + physical split (two cards + timeline strip)
 *        - Section 3 — eligibility as 3 icon cards
 *        - Section 4 (text) — how to find one
 *        - Section 5 — FAQ accordion (unchanged)
 *   3. CTA card → /bips.
 *   4. Outbound EC link.
 *
 * Constraints kept:
 *   - Pure RSC (no 'use client'), `force-static` revalidation.
 *   - Accordion uses `multiple` prop, not `type='multiple'`.
 *   - EC link rel="noopener noreferrer", no claim of EC affiliation.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Laptop,
  Building2,
  UserCheck,
  GraduationCap,
  Languages,
  ArrowRight,
} from 'lucide-react'
import { Eyebrow } from '@/components/home/Eyebrow'
import { PageSidebar } from '@/components/what-is-a-bip/PageSidebar'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'What is a BIP? · BipHub',
  description:
    'An Erasmus+ Blended Intensive Programme (BIP) is a short, intensive course combining a 5–10 day in-person mobility with a virtual component, worth 3–6 ECTS credits. Here is what to know before applying.',
  alternates: { canonical: 'https://biphub.eu/what-is-a-bip' },
}

const SECTIONS = [
  { id: 'what', label: 'What is a BIP?' },
  { id: 'virtual-physical', label: 'Virtual + physical components' },
  { id: 'ects', label: 'ECTS, eligibility, language' },
  { id: 'find', label: 'How to find one on BipHub' },
  { id: 'faq', label: 'Frequently asked questions' },
] as const

// Hero stat strip — static facts about BIPs (not live DB counts).
const HERO_STATS = [
  { value: '5–10', unit: 'days', label: 'In-person mobility' },
  { value: '3–6', unit: 'ECTS', label: 'Credits awarded' },
  { value: '€79', unit: '/ day', label: 'Living allowance' },
  { value: '33', unit: 'countries', label: 'Erasmus+ programme area' },
] as const

// FAQ card chrome — pulled out so each AccordionItem trigger/content stays readable.
const FAQ_ITEM_CLS =
  'mb-3 rounded-xl border border-eu-blue-100 bg-white shadow-[0_2px_8px_rgba(10,23,53,0.04)] transition-all hover:border-eu-blue-100/80 hover:shadow-[0_4px_16px_rgba(10,23,53,0.08)] data-open:border-eu-gold/50 data-open:bg-eu-gold-soft/15'
const FAQ_TRIGGER_CLS =
  'items-center gap-4 px-5 py-4 text-base font-normal hover:no-underline'
const FAQ_CONTENT_CLS =
  'px-5 pb-4 text-[15px] leading-relaxed text-ink-2'

function FaqQ({ question }: { question: string }) {
  return (
    <span className="block flex-1 text-left text-[16px] font-semibold leading-snug text-ink">
      {question}
    </span>
  )
}

export default function WhatIsABipPage() {
  return (
    <>
      {/* === Dark hero band — eyebrow + h1 + lead + stat strip === */}
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
            <span className="text-white">Student guide</span>
          </Eyebrow>
          <h1
            className="max-w-[18ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            What is a{' '}
            <span className="text-eu-gold">Blended Intensive Programme</span>?
          </h1>
          <p className="mt-6 max-w-[62ch] text-[18px] leading-relaxed text-white/70">
            A short, fully-funded Erasmus+ format combining a 5&ndash;10 day
            in-person mobility with an online learning component. Here is what
            to know before you apply.
          </p>

          {/* Stat strip */}
          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {HERO_STATS.map((s) => (
              <div
                key={s.label}
                className="group relative overflow-hidden rounded-lg border border-white/15 bg-white/5 p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-eu-gold/40 hover:bg-white/[0.08] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
              >
                {/* Soft gold halo on hover */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-eu-gold/0 opacity-0 blur-2xl transition-all duration-500 group-hover:bg-eu-gold/20 group-hover:opacity-100"
                />

                <div className="relative flex items-baseline gap-1.5">
                  <span
                    className="font-bold text-white"
                    style={{
                      fontSize: 'clamp(26px, 3.4vw, 36px)',
                      letterSpacing: '-1px',
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </span>
                  <span className="text-[13px] font-semibold text-eu-gold">
                    {s.unit}
                  </span>
                </div>
                <div className="relative mt-2 text-[13px] font-medium text-white/70 transition-colors duration-300 group-hover:text-white/90">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Article body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          {/* Desktop-only jump-link sidebar with active-section tracking */}
          <aside className="hidden lg:block">
            <PageSidebar sections={SECTIONS} />
          </aside>

          {/* Main content column */}
          <article className="min-w-0">
            {/* Section 1 — What is a BIP? */}
            <section id="what" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Definition</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                What is a BIP?
              </h2>
              <div className="mt-4 max-w-none text-ink-2 leading-relaxed space-y-4">
                <p>
                  A BIP is a Blended Intensive Programme — a short, mixed-format
                  course funded under the European Union&apos;s flagship higher-
                  education mobility scheme, Erasmus+ Key Action 131 (KA131). It
                  is organised by a group of European universities, with one
                  host and several partner institutions, and is open to students
                  enrolled at any of them.
                </p>
                <p>
                  The &ldquo;intensive&rdquo; part is literal: the in-person
                  component runs for just 5 to 10 days. Students travel to the
                  host university for an immersive week of seminars, labs, group
                  work, or field trips on a defined topic — sustainable cities,
                  AI ethics, European business law, you name it.
                </p>
                <p>
                  The &ldquo;blended&rdquo; part is what distinguishes BIPs from
                  a conventional short exchange. Every BIP includes a mandatory
                  virtual learning component delivered before, during, or after
                  the physical week. Together, the two halves earn participants
                  3 to 6 ECTS credits that count toward their home degree.
                </p>
                <p>
                  BIPs were introduced in the 2021&ndash;2027 Erasmus+ programme
                  cycle as a way to broaden access to international study for
                  students who cannot commit to a full semester abroad — working
                  students, parents, students on tight degree timelines, or
                  anyone hesitant about a long-form exchange.
                </p>
              </div>
            </section>

            {/* Section 2 — Virtual + physical components (VISUAL SPLIT) */}
            <section id="virtual-physical" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Format</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                Virtual + physical components
              </h2>
              <p className="mt-4 max-w-[62ch] text-ink-2 leading-relaxed">
                A BIP is two halves stitched into one programme. Both are
                mandatory; together they make it &ldquo;blended.&rdquo;
              </p>

              {/* Two-column split */}
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Online card */}
                <div className="relative flex flex-col rounded-xl border border-eu-blue-100 bg-white p-7 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                    <Laptop size={24} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-ink">
                    Online learning
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                    Several weeks · asynchronous
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                    Pre-reading, recorded lectures, group projects, and
                    moderated discussion threads delivered on the host&apos;s
                    learning platform. Without this layer the programme
                    wouldn&apos;t qualify as blended under Erasmus+ rules.
                  </p>
                </div>

                {/* Physical card */}
                <div className="relative flex flex-col rounded-xl border border-eu-gold/50 bg-eu-gold-soft/30 p-7 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-eu-gold text-ink">
                    <Building2 size={24} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[20px] font-semibold tracking-tight text-ink">
                    On-site mobility
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-ink">
                    5–10 days · in person
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                    Travel to the host university for immersive seminars, labs,
                    group work, field trips, and cultural activities alongside
                    peers from across Europe. Funded by your home institution
                    via the standard Erasmus+ grant.
                  </p>
                </div>
              </div>

              {/* Timeline strip */}
              <div className="mt-5 rounded-xl border border-eu-blue-100 bg-eu-blue-50/40 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  How they overlap — a typical schedule
                </p>

                <div className="mt-5 relative h-14">
                  {/* Online band — spans full width, thin */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-5 h-4 rounded-full border border-eu-blue/25 bg-eu-blue/15"
                  />
                  <span className="absolute left-0 top-0 text-[10px] font-bold uppercase tracking-wider text-eu-blue">
                    Online · weeks
                  </span>

                  {/* Physical block — middle, thicker, gold */}
                  <div
                    aria-hidden="true"
                    className="absolute top-2 h-10 rounded-md border border-eu-gold-dark bg-eu-gold shadow-[0_2px_8px_rgba(255,204,0,0.35)]"
                    style={{ left: '42%', width: '16%' }}
                  />
                  <span
                    className="absolute top-4 text-[11px] font-bold uppercase tracking-wider text-ink"
                    style={{ left: '42%', width: '16%', textAlign: 'center' }}
                  >
                    On site
                    <span className="block text-[9px] font-semibold normal-case tracking-normal text-ink-2">
                      5–10 days
                    </span>
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-[11px] font-medium text-muted">
                  <span>Pre-readings begin</span>
                  <span>Travel week</span>
                  <span>Group projects · assessment</span>
                </div>
              </div>
            </section>

            {/* Section 3 — ECTS, eligibility, language (ICON CARDS) */}
            <section id="ects" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Eligibility</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                ECTS, eligibility, language
              </h2>
              <p className="mt-4 max-w-[62ch] text-ink-2 leading-relaxed">
                Three things to confirm before you apply — the credit value, who
                qualifies, and what language the programme is taught in.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Credits */}
                <div className="flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                    <GraduationCap size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    Credits
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                    3–6 ECTS
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                    Transferred to your home degree via the standard Erasmus+
                    learning agreement, signed by your Erasmus office before you
                    travel. Confirm the exact value on the listing — it varies
                    by programme.
                  </p>
                </div>

                {/* Who can apply */}
                <div className="flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                    <UserCheck size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    Who can apply
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                    Bachelor · Master · PhD
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                    Enrolled higher-education students at any Erasmus+
                    participating institution. Many BIPs further restrict to
                    students from a specified group of partner universities —
                    check each listing.
                  </p>
                </div>

                {/* Language */}
                <div className="flex flex-col rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                    <Languages size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    Language
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                    Mostly English · CEFR B2
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                    The majority of BIPs are taught in English at a B2 minimum.
                    You will also find programmes in German, French, Spanish, or
                    Italian. Language and level are on every listing.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 4 — How to find one on BipHub */}
            <section id="find" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Discovery</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                How to find one on BipHub
              </h2>
              <div className="mt-4 max-w-none text-ink-2 leading-relaxed space-y-4">
                <p>
                  Open{' '}
                  <Link href="/bips" className="text-eu-blue underline">
                    Browse all BIPs
                  </Link>{' '}
                  and use the filters in the sidebar to narrow the catalogue by
                  country, field of study, language, mobility dates, ECTS
                  credits, application status, and study level. Any combination
                  of filters is shareable — the URL updates as you refine, so
                  you can bookmark or send a link that reproduces the same view.
                  From there, click into any listing for the full description,
                  host and partner universities, deadlines, and how to apply
                  through your home Erasmus office.
                </p>
              </div>
            </section>

            {/* Section 5 — FAQ */}
            <section id="faq" className="mb-16 scroll-mt-24">
              <Eyebrow className="mb-3">FAQ</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
                Frequently asked questions
              </h2>
              <p className="mt-4 max-w-[62ch] text-ink-2 leading-relaxed">
                Eight questions students ask before applying. Click any to
                expand.
              </p>

              <div className="mt-8">
                <Accordion multiple>
                  <AccordionItem value="faq-1" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="Who can apply to a BIP?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Enrolled higher-education students at an Erasmus+-
                        participating institution — Bachelor, Master, or PhD
                        level. Specifics depend on each host BIP&apos;s
                        eligibility notes, which sometimes restrict the
                        programme to a particular faculty, year group, or
                        partner-university cohort.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-2" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="How long does a BIP last?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Between 5 and 10 days of in-person physical mobility at
                        the host university, plus an asynchronous virtual
                        component that typically spans several weeks before,
                        during, or after the on-site week. The virtual part is
                        what makes the programme &ldquo;blended&rdquo; rather
                        than a normal short exchange.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-3" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="Do I get ECTS credits?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Yes — most BIPs award 3 to 6 ECTS credits depending on
                        workload. The credits transfer to your home degree
                        through the standard Erasmus+ learning-agreement
                        process, signed by your home university before you
                        travel. Confirm the exact ECTS value on the BIP listing
                        and with your Erasmus office before applying.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-4" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="What language is the BIP in?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Most BIPs run in English with a CEFR B2 minimum, but
                        BipHub also lists programmes in German, French, Spanish,
                        and Italian. Use the language filter on{' '}
                        <Link href="/bips" className="text-eu-blue">
                          /bips
                        </Link>{' '}
                        to narrow the catalogue to languages you are comfortable
                        studying in.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-5" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="Are travel costs covered?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Erasmus+ funds a daily living allowance — currently
                        around €79 per day — plus a travel grant calculated by
                        distance band. The funding is disbursed by your home
                        university, not the host. BipHub is a directory only;
                        we do not handle money or paperwork.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-6" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="Can I join from outside the EU?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Key Action 131 funding is available to students enrolled
                        at Erasmus+-participating institutions, most of which
                        are in EU member states or programme-associated
                        countries. Students at non-participating institutions
                        are not eligible for the Erasmus+ grant, though some
                        host universities accept self-funded participants on a
                        case-by-case basis.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-7" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="How are BIPs different from regular Erasmus exchange?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        A full Erasmus+ semester or year places you at a host
                        university for 3 to 12 months. A BIP is a short,
                        intensive format — 5 to 10 days physical plus an
                        asynchronous virtual component — designed for students
                        who cannot commit to a full semester abroad. Both award
                        ECTS and are funded by Erasmus+, but the time commitment
                        and intensity differ sharply.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq-8" className={FAQ_ITEM_CLS}>
                    <AccordionTrigger className={FAQ_TRIGGER_CLS}>
                      <FaqQ question="How do I apply through my home university?" />
                    </AccordionTrigger>
                    <AccordionContent className={FAQ_CONTENT_CLS}>
                      <p>
                        Contact your home university&apos;s Erasmus or
                        international office. They handle the application, the
                        learning agreement, and the grant disbursement.
                        Applications are submitted to your home institution —
                        not through BipHub. Use the contact details on each BIP
                        listing only after confirming with your home Erasmus
                        office that the programme is eligible for your degree.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </section>

            {/* Final CTA card */}
            <section
              aria-label="Browse the BIP catalogue"
              className="relative mt-4 overflow-hidden rounded-2xl border border-eu-blue-100 p-8 md:p-10"
              style={{
                backgroundColor: '#0a1735',
                backgroundImage: [
                  'radial-gradient(ellipse 70% 80% at 100% 50%, rgba(255, 204, 0, 0.22) 0%, transparent 65%)',
                  'radial-gradient(ellipse 65% 70% at 0% 100%, rgba(0, 51, 153, 0.55) 0%, transparent 60%)',
                ].join(', '),
              }}
            >
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="max-w-[44ch]">
                  <Eyebrow className="mb-3 text-white">
                    <span className="text-white">Ready when you are</span>
                  </Eyebrow>
                  <h3
                    className="font-bold text-white"
                    style={{
                      fontSize: 'clamp(22px, 2.8vw, 30px)',
                      lineHeight: '1.15',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    Find a BIP that fits your degree.
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                    Browse the full catalogue — filter by country, field,
                    language, dates, and ECTS to land on programmes that match
                    your home university and study plan.
                  </p>
                </div>
                <Link
                  href="/bips"
                  className="group inline-flex items-center justify-center gap-2 self-start rounded-full bg-eu-gold px-6 py-3 text-[15px] font-semibold text-ink shadow-[0_4px_16px_rgba(255,204,0,0.3)] transition-transform hover:-translate-y-0.5 hover:bg-eu-gold-dark md:self-auto"
                >
                  Browse all BIPs
                  <ArrowRight
                    size={18}
                    strokeWidth={2.2}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </section>

            {/* Outbound EC link — INFO-04 */}
            <section aria-label="Official Erasmus+ resources">
              <p className="mt-10 text-sm text-muted">
                <a
                  href="https://erasmus-plus.ec.europa.eu/programme-guide/part-b/ka1/short-term-mobility-projects/blended-intensive-programmes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-eu-blue underline"
                >
                  Read the official Erasmus+ programme guide entry on BIPs
                </a>
              </p>
            </section>
          </article>
        </div>
      </div>
    </>
  )
}
