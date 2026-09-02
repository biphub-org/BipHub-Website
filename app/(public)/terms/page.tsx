/**
 * /terms — static Terms of Service page (RSC).
 *
 * Shares the /what-is-a-bip visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead + last-updated.
 *  - Article body inside max-w-[1200px] container, 220px sticky TOC sidebar.
 *  - Pure RSC, force-static, 8 sections in locked order.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'
import { PageSidebar } from '@/components/what-is-a-bip/PageSidebar'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Terms of service · BipHub',
  description:
    'Terms governing your use of BipHub — the free, open-source directory of Erasmus+ Blended Intensive Programmes. Independent project, not affiliated with the European Commission.',
  alternates: { canonical: 'https://biphub.eu/terms' },
}

const SECTIONS = [
  { id: 'about-service', label: 'About this service' },
  { id: 'who-can-use', label: 'Who can use it' },
  { id: 'content-accuracy', label: 'Content accuracy' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'your-content', label: 'Your content' },
  { id: 'open-source', label: 'Open source & IP' },
  { id: 'no-warranty', label: 'No warranty' },
  { id: 'changes-contact', label: 'Changes and contact' },
] as const

export default function TermsPage() {
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
            <span className="text-white">Legal</span>
          </Eyebrow>
          <h1
            className="max-w-[14ch] font-bold text-white"
            style={{
              fontSize: 'clamp(34px, 5.2vw, 56px)',
              lineHeight: '1.05',
              letterSpacing: '-1.5px',
            }}
          >
            Terms of <span className="text-eu-gold">service</span>
          </h1>
          <p className="mt-6 max-w-[62ch] text-[18px] leading-relaxed text-white/70">
            The rules for using BipHub — an independent, open-source directory of Erasmus+ Blended Intensive Programmes. Not affiliated with the European Commission, and provided without warranty under the MIT licence.
          </p>
          <p className="mt-6 text-[13px] font-medium text-white/50">Last updated: 15th May 2026</p>
        </div>
      </section>

      {/* === Article body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <PageSidebar sections={SECTIONS} />
          </aside>

          <article className="min-w-0">
            <section id="about-service" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 1 · About this service</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">About this service</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  BipHub is a free, open-source directory of Erasmus+ Blended Intensive Programmes (BIPs) operated by Hexona Systems. It is an independent project and is not affiliated with, endorsed by, or officially connected to the European Commission, the Erasmus+ National Agencies, or any participating university. References to Erasmus+ are descriptive only.
                </p>
                <p>By accessing or using BipHub, you agree to these terms. If you do not agree, please do not use the service.</p>
              </div>
            </section>

            <section id="who-can-use" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 2 · Who can use it</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Who can use it</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  Browsing the public directory is open to anyone. Submitting BIPs is reserved for staff at higher-education institutions participating in Erasmus+ — typically programme coordinators, international officers, or academic staff with authority to publicise the programme on behalf of their institution. By creating a coordinator account you confirm that you have that authority and that the content you submit is accurate to the best of your knowledge.
                </p>
              </div>
            </section>

            <section id="content-accuracy" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 3 · Content accuracy</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Content accuracy</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  BipHub publishes programme information supplied by coordinators or sourced from publicly available institutional materials. We review submissions for obvious errors but we do not independently verify every field. Dates, ECTS values, eligibility rules, application deadlines, and funding levels can change without notice. Always confirm details with the host institution and your own Erasmus+ office before you act on a listing.
                </p>
                <p>We are not a party to any application, learning agreement, or mobility arrangement between you and a university. BipHub does not handle applications, payments, grants, or travel logistics.</p>
              </div>
            </section>

            <section id="acceptable-use" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 4 · Acceptable use</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Acceptable use</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>You agree not to:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Submit content you do not have the right to publish, or that misrepresents an institution or programme.</li>
                  <li>Use the directory to send unsolicited bulk communications, advertise unrelated services, or run automated scraping that degrades the service for others.</li>
                  <li>Attempt to bypass authentication, access other coordinators&apos; drafts, or circumvent the review queue.</li>
                  <li>Upload content that infringes intellectual-property rights, is defamatory, or violates applicable law.</li>
                </ul>
                <p>We may remove content or suspend accounts that violate these rules, at our discretion and without prior notice.</p>
              </div>
            </section>

            <section id="your-content" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 5 · Your content</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Your content</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  You retain ownership of the programme information you submit. By submitting content for publication you grant BipHub a non-exclusive, worldwide, royalty-free licence to display, format, translate, and distribute that content as part of the public directory and any export or syndication BipHub may offer in the future.
                </p>
                <p>
                  You can update or remove your submissions at any time from <code>/dashboard</code>. If you delete your account, approved programmes are anonymised — the institutional information remains in the public directory but personal contact details are removed. See the{' '}
                  <Link href="/privacy" className="text-eu-blue underline">
                    privacy policy
                  </Link>{' '}
                  for details.
                </p>
              </div>
            </section>

            <section id="open-source" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 6 · Open source and intellectual property</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Open source and intellectual property</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  The BipHub software is published under the MIT licence and the source code is available on GitHub. The MIT licence covers the code only — it does not transfer rights to the BipHub name, logo, or content submitted by coordinators. The visual identity uses the standard Erasmus+ colour palette; the logo deliberately uses a star count different from the 12-star European emblem to avoid implying EU endorsement.
                </p>
              </div>
            </section>

            <section id="no-warranty" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 7 · No warranty, limitation of liability</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">No warranty, limitation of liability</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranty of any kind, express or implied, including but not limited to fitness for a particular purpose and non-infringement. To the maximum extent permitted by law, Hexona Systems and the BipHub contributors are not liable for indirect, incidental, or consequential damages arising from your use of the service — including missed deadlines, rejected applications, travel arrangements, or financial losses. Nothing in these terms excludes liability that cannot lawfully be excluded under your local consumer protection law.
                </p>
              </div>
            </section>

            <section id="changes-contact" className="mb-16 scroll-mt-24">
              <Eyebrow className="mb-3">Section 8 · Changes and contact</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Changes and contact</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  We may update these terms as the project evolves. Material changes will be reflected on this page with an updated date stamp at the top. Continued use of the service after a change constitutes acceptance of the new terms. For questions about these terms or to report content that violates them, email{' '}
                  <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
                    biphub.org@gmail.com
                  </a>
                  .
                </p>
              </div>
            </section>
          </article>
        </div>
      </div>
    </>
  )
}
