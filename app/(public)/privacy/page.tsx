/**
 * /privacy — static privacy policy page (RSC).
 *
 * Implements FOUN-06 (privacy policy page) and documents the FOUN-05 posture
 * (zero analytics, no consent banner needed) per Phase 4 D-01 / D-02 / D-03 in
 * 04-CONTEXT.md.
 *
 * Per the locked structure in 04-CONTEXT.md (D-03):
 *  - Pure RSC (no 'use client'), `force-static` revalidation.
 *  - 8 content sections in the locked order: Data Controller, What we collect,
 *    Legal basis, Retention, Your rights, How to exercise, Children, Updates.
 *  - 600–900 word target body.
 *  - Enumerates every storage surface: Supabase Auth cookies, biphub:bookmarks,
 *    bip-draft, bips table content, profiles table.
 *  - Documents zero analytics, no third-party trackers, no marketing pixels.
 *  - Names team@hexonasystems.com as the data controller contact.
 *  - No consent banner is shipped or linked because no consent-requiring
 *    cookies/scripts are loaded.
 *
 * Reached via a footer link added in Plan 04-02 Task 2.
 */

import type { Metadata } from 'next'
import { Eyebrow } from '@/components/home/Eyebrow'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Privacy policy · BipHub',
  description:
    'How BipHub processes personal data for EU users. We use no analytics, no third-party trackers, and no marketing pixels. Essential session cookies only.',
  alternates: { canonical: 'https://biphub.eu/privacy' },
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-[800px] px-4 lg:px-6 py-16 lg:py-24">
      {/* Page header */}
      <header className="mb-12">
        <Eyebrow className="mb-3">Legal</Eyebrow>
        <h1 className="text-[clamp(32px,4vw,44px)] font-bold tracking-tight text-ink">
          Privacy policy
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: 15th June 2026</p>
      </header>

      {/* Section 1 — Data Controller */}
      <section>
        <Eyebrow className="mb-3">Section 1</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12 first:mt-0">
          Data Controller
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            Hexona Systems operates BipHub as an independent open-source project.
            The data controller for personal data processed through this site is
            Hexona Systems. For privacy questions or to exercise your rights
            under GDPR Articles 15&ndash;17, contact us at{' '}
            <a
              href="mailto:team@hexonasystems.com"
              className="text-eu-blue underline"
            >
              team@hexonasystems.com
            </a>
            .
          </p>
        </div>
      </section>

      {/* Section 2 — What we collect */}
      <section>
        <Eyebrow className="mb-3">Section 2</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          What we collect
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            <strong className="text-ink">
              Supabase Auth session cookies (essential).
            </strong>{' '}
            When you sign in as a university coordinator, our authentication
            provider (Supabase) sets HTTP-only cookies that keep you signed in
            across page loads. These cookies are strictly necessary for the
            sign-in feature to function and are exempt from consent under EU
            ePrivacy rules.
          </p>
          <p>
            <strong className="text-ink">Saved BIPs.</strong> When a signed-in student
            saves a BIP, we store a <code>saved_bips</code> table row containing your
            user ID, the BIP&apos;s internal ID, and the timestamp of the save
            (<code>saved_at</code>). This data is stored in Supabase (EU region) and is
            used solely to sync your saved BIPs across devices. It is retained until you
            remove the BIP from your saved list or delete your account. All{' '}
            <code>saved_bips</code> rows are permanently deleted when you delete your
            account (cascading deletion via foreign key). No saved-BIP data is shared
            with third parties.
          </p>
          <p>
            <strong className="text-ink">Legacy bookmark sweep.</strong> On first
            sign-in, the app reads any <code>biphub:bookmarks</code> value previously
            stored in your browser&apos;s <code>localStorage</code> (from an earlier
            version of BipHub), migrates valid BIP IDs into your server-side saved list,
            then immediately clears the <code>localStorage</code> key. After this
            one-time sweep the key is not written again.
          </p>
          <p>
            <strong className="text-ink">Local browser storage.</strong> The{' '}
            <code>bip-draft</code> key holds an in-progress BIP submission so
            you do not lose your work if your session expires mid-form. This
            data is essential to the feature it supports and remains on your
            device only.
          </p>
          <p>
            <strong className="text-ink">
              Coordinator profile and submission content.
            </strong>{' '}
            When a university coordinator registers, we store their full name,
            contact email, university affiliation, and Erasmus institutional
            code. When they submit a BIP, we store the submission content
            (programme title, description, dates, contact details they wish to
            publish, and so on). Approved submissions are published as part of
            the public Erasmus+ directory.
          </p>
          <p>
            <strong className="text-ink">Alert subscriptions.</strong> When a signed-in student creates an alert, we store a <code>bip_subscriptions</code> row with your user ID, your chosen field of study and/or country, frequency (<code>weekly</code> or{' '}<code>daily</code>), the explicit consent text you agreed to, and creation time. This is used solely to send you the digest emails you requested.
          </p>
          <p>
            <strong className="text-ink">Alert deliveries.</strong> Each time we send you a digest, we store a <code>bip_alert_deliveries</code> row (BIP ID + your user ID + delivery time) so the same BIP is never emailed twice for the same subscription. Both surfaces are retained until you delete the subscription or delete your account. All{' '}<code>bip_subscriptions</code> and <code>bip_alert_deliveries</code> rows are permanently deleted when you delete your account (cascading deletion via foreign key). You can unsubscribe at any time via the link in the email (no sign-in required) or from your dashboard.
          </p>
          <p>
            <strong className="text-ink">No analytics.</strong> We run no
            analytics scripts, no third-party trackers, no marketing pixels, no
            advertising cookies. We do not measure your behaviour. This is by
            design &mdash; the cheapest GDPR-compliant path is to collect
            nothing.
          </p>
        </div>
      </section>

      {/* Section 3 — Legal basis */}
      <section>
        <Eyebrow className="mb-3">Section 3</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Legal basis
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            For coordinator accounts, the legal basis is contract performance
            (Art 6(1)(b) GDPR) &mdash; we cannot operate the directory without
            storing the account. For published BIP submissions, the legal basis
            is legitimate interest (Art 6(1)(f) GDPR) in maintaining a public
            Erasmus+ directory benefiting students across Europe. We do not rely
            on consent for any data processing in v1 because we collect no
            consent-requiring data.
          </p>
        </div>
      </section>

      {/* Section 4 — Retention */}
      <section>
        <Eyebrow className="mb-3">Section 4</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Retention
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            Account data is retained until you delete your account from{' '}
            <code>/dashboard/settings</code>. When you delete your account,
            drafts and pending/rejected submissions are deleted; approved BIPs
            are anonymized (contact name and email are removed) and remain in
            the public directory as institutional information. Session cookies
            expire when you sign out or when their issuer&apos;s policy expires
            them.
          </p>
        </div>
      </section>

      {/* Section 5 — Your rights */}
      <section>
        <Eyebrow className="mb-3">Section 5</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Your rights
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            Under GDPR you have the right of access (Art 15) to a copy of your
            personal data, the right of rectification (Art 16) to correct
            inaccurate data, and the right of erasure (Art 17) to have your data
            deleted. The right of erasure is exercised in-product via the Delete
            account button at <code>/dashboard/settings</code>. For access or
            rectification requests, email{' '}
            <a
              href="mailto:team@hexonasystems.com"
              className="text-eu-blue underline"
            >
              team@hexonasystems.com
            </a>{' '}
            &mdash; we respond within 30 days.
          </p>
        </div>
      </section>

      {/* Section 6 — How to exercise your rights */}
      <section>
        <Eyebrow className="mb-3">Section 6</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          How to exercise your rights
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            In-product: open <code>/dashboard/settings</code> while signed in
            and use the Danger zone &mdash; Delete account. By email: write to{' '}
            <a
              href="mailto:team@hexonasystems.com"
              className="text-eu-blue underline"
            >
              team@hexonasystems.com
            </a>{' '}
            from the email address on your account. We may ask for additional
            information to verify your identity before acting on a request
            affecting personal data.
          </p>
        </div>
      </section>

      {/* Section 7 — Children */}
      <section>
        <Eyebrow className="mb-3">Section 7</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Children
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            BipHub is designed for higher-education students enrolled in
            Erasmus+-participating institutions. We do not knowingly process the
            personal data of children under 16 and we do not target children in
            any of our content.
          </p>
        </div>
      </section>

      {/* Section 8 — Updates */}
      <section>
        <Eyebrow className="mb-3">Section 8</Eyebrow>
        <h2 className="text-[clamp(24px,3vw,32px)] font-bold tracking-tight text-ink mt-12">
          Updates
        </h2>
        <div className="mt-4 text-ink-2 leading-relaxed space-y-4">
          <p>
            We may update this policy as the product evolves. Material changes
            will be reflected on this page with an updated date stamp at the
            top. We do not currently maintain a public change log; if you need
            to see past versions, write to{' '}
            <a
              href="mailto:team@hexonasystems.com"
              className="text-eu-blue underline"
            >
              team@hexonasystems.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
