/**
 * /contact — static contact page (RSC + one client form island).
 *
 * Shares the /about visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead.
 *  - Two-column body: topic cards + direct channels | working form.
 *  - Pure static shell (force-static); ContactForm hydrates on the client.
 */

import type { Metadata } from 'next'
import { Eyebrow } from '@/components/home/Eyebrow'
import { ContactSection } from './ContactSection'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Contact us · BipHub',
  description:
    'Get in touch with the BipHub team — general questions, BIP listing help, or bug reports. We reply within a few working days.',
  alternates: { canonical: 'https://biphub.eu/contact' },
}

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
        <ContactSection />
      </div>
    </>
  )
}
