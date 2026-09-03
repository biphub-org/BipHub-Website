/**
 * /contact — static contact page (RSC + one client form island).
 *
 * Shares the /about visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead.
 *  - Two-column body: topic cards + direct channels | working form.
 *  - Pure static shell (force-static); ContactForm hydrates on the client.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'
import { ContactForm } from './ContactForm'
import { Mail, MessagesSquare, GraduationCap, LifeBuoy, Sparkles } from 'lucide-react'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Contact us · BipHub',
  description:
    'Get in touch with the BipHub team — general questions, BIP listing help, or bug reports. We reply within a few working days.',
  alternates: { canonical: 'https://biphub.eu/contact' },
}

const TOPIC_CARDS = [
  {
    icon: MessagesSquare,
    title: 'General question',
    body: 'About the project, partnerships, press, or anything else — start here.',
  },
  {
    icon: GraduationCap,
    title: 'BIP listing help',
    body: 'Coordinators: questions about submitting, editing, or publishing your BIP.',
  },
  {
    icon: LifeBuoy,
    title: 'Bug report / support',
    body: 'Something broken? Tell us the page URL and what you expected to happen.',
  },
] as const

export default function ContactPage() {
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
            <span className="text-white">Contact</span>
          </Eyebrow>
          <h1
            className="max-w-[20ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            Talk to a human, <span className="text-eu-gold">not a ticket queue.</span>
          </h1>
          <p className="mt-6 max-w-[65ch] text-[18px] leading-relaxed text-white/70">
            Questions about a BIP, help listing yours, or a bug to report — pick a topic
            and send us a message. We read everything ourselves.
          </p>
        </div>
      </section>

      {/* === Body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          {/* Left: topics + direct channels */}
          <div>
            <Eyebrow className="mb-3">How we can help</Eyebrow>
            <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
              Pick a topic.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-2">
              Choosing the right topic routes your message to the person who can
              actually answer it — so you hear back faster.
            </p>

            <div className="mt-8 space-y-4">
              {TOPIC_CARDS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)]"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{body}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href="mailto:biphub.org@gmail.com"
                className="group flex items-center gap-4 rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
                  <Mail size={20} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink group-hover:text-eu-blue">Email us</span>
                  <span className="block text-[12px] text-muted">biphub.org@gmail.com</span>
                </span>
              </a>
              <Link
                href="/coming-soon"
                className="group flex items-center gap-4 rounded-xl border border-eu-blue-100 bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-eu-blue-200 hover:shadow-[0_12px_28px_rgba(10,23,53,0.10)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-white">
                  <Sparkles size={20} />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink group-hover:text-eu-blue">See what&apos;s next</span>
                  <span className="block text-[12px] text-muted">Features on the roadmap</span>
                </span>
              </Link>
            </div>
          </div>

          {/* Right: the form */}
          <ContactForm />
        </div>
      </div>
    </>
  )
}
