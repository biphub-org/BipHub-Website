/**
 * /terms — static Terms of Service page (RSC).
 *
 * Companion to /privacy. Layout mirrors the privacy page: single-column,
 * max-w-[800px], 8 numbered sections, force-static.
 *
 * The terms emphasise that BipHub is an independent open-source directory,
 * not the European Commission, that submission content is published "as is"
 * on a legitimate-interest basis, and that the service is provided without
 * warranty under the MIT licence.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Terms of service · BipHub',
  description:
    'Terms governing your use of BipHub — the free, open-source directory of Erasmus+ Blended Intensive Programmes. Independent project, not affiliated with the European Commission.',
  alternates: { canonical: 'https://biphub.eu/terms' },
}

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-[800px] px-4 lg:px-6 py-16 lg:py-24">
      <header className="mb-12">
        <Eyebrow className="mb-3">Legal</Eyebrow>
        <h1 className="text-[clamp(32px,4vw,44px)] font-bold tracking-tight text-ink">
          Terms of service
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: 15th May 2026</p>
      </header>

      <section>
        <Eyebrow className="mb-3">Section 1</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12 first:mt-0">
          About this service
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            BipHub is a free, open-source directory of Erasmus+ Blended
            Intensive Programmes (BIPs) operated by Hexona Systems. It is an
            independent project and is not affiliated with, endorsed by, or
            officially connected to the European Commission, the Erasmus+
            National Agencies, or any participating university. References to
            Erasmus+ are descriptive only.
          </p>
          <p>
            By accessing or using BipHub, you agree to these terms. If you do
            not agree, please do not use the service.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 2</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Who can use it
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            Browsing the public directory is open to anyone. Submitting BIPs is
            reserved for staff at higher-education institutions participating in
            Erasmus+ &mdash; typically programme coordinators, international
            officers, or academic staff with authority to publicise the
            programme on behalf of their institution. By creating a coordinator
            account you confirm that you have that authority and that the
            content you submit is accurate to the best of your knowledge.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 3</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Content accuracy
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            BipHub publishes programme information supplied by coordinators or
            sourced from publicly available institutional materials. We review
            submissions for obvious errors but we do not independently verify
            every field. Dates, ECTS values, eligibility rules, application
            deadlines, and funding levels can change without notice. Always
            confirm details with the host institution and your own Erasmus+
            office before you act on a listing.
          </p>
          <p>
            We are not a party to any application, learning agreement, or
            mobility arrangement between you and a university. BipHub does not
            handle applications, payments, grants, or travel logistics.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 4</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Acceptable use
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Submit content you do not have the right to publish, or that
              misrepresents an institution or programme.
            </li>
            <li>
              Use the directory to send unsolicited bulk communications,
              advertise unrelated services, or run automated scraping that
              degrades the service for others.
            </li>
            <li>
              Attempt to bypass authentication, access other coordinators&apos;
              drafts, or circumvent the review queue.
            </li>
            <li>
              Upload content that infringes intellectual-property rights, is
              defamatory, or violates applicable law.
            </li>
          </ul>
          <p>
            We may remove content or suspend accounts that violate these rules,
            at our discretion and without prior notice.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 5</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Your content
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            You retain ownership of the programme information you submit. By
            submitting content for publication you grant BipHub a non-exclusive,
            worldwide, royalty-free licence to display, format, translate, and
            distribute that content as part of the public directory and any
            export or syndication BipHub may offer in the future.
          </p>
          <p>
            You can update or remove your submissions at any time from{' '}
            <code>/dashboard</code>. If you delete your account, approved
            programmes are anonymised &mdash; the institutional information
            remains in the public directory but personal contact details are
            removed. See the{' '}
            <Link href="/privacy" className="text-eu-blue underline">
              privacy policy
            </Link>{' '}
            for details.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 6</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Open source and intellectual property
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            The BipHub software is published under the MIT licence and the
            source code is available on GitHub. The MIT licence covers the code
            only &mdash; it does not transfer rights to the BipHub name, logo,
            or content submitted by coordinators. The visual identity uses the
            standard Erasmus+ colour palette; the logo deliberately uses a star
            count different from the 12-star European emblem to avoid implying
            EU endorsement.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 7</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          No warranty, limitation of liability
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            The service is provided &ldquo;as is&rdquo; and &ldquo;as
            available,&rdquo; without warranty of any kind, express or implied,
            including but not limited to fitness for a particular purpose and
            non-infringement. To the maximum extent permitted by law, Hexona
            Systems and the BipHub contributors are not liable for indirect,
            incidental, or consequential damages arising from your use of the
            service &mdash; including missed deadlines, rejected applications,
            travel arrangements, or financial losses. Nothing in these terms
            excludes liability that cannot lawfully be excluded under your
            local consumer protection law.
          </p>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-3">Section 8</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Changes and contact
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            We may update these terms as the project evolves. Material changes
            will be reflected on this page with an updated date stamp at the
            top. Continued use of the service after a change constitutes
            acceptance of the new terms. For questions about these terms or to
            report content that violates them, email{' '}
            <a
              href="mailto:biphub.org@gmail.com"
              className="text-eu-blue underline"
            >
              biphub.org@gmail.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
