/**
 * /privacy — static privacy policy page (RSC).
 *
 * Shares the /what-is-a-bip visual language:
 *  - Full-bleed dark hero (#0a1735, halos) — eyebrow + h1 + lead + last-updated.
 *  - Article body inside max-w-[1200px] container, 220px sticky TOC sidebar.
 *  - Pure RSC, force-static, 8 sections in locked order (D-03).
 */

import type { Metadata } from 'next'
import { Eyebrow } from '@/components/home/Eyebrow'
import { PageSidebar } from '@/components/what-is-a-bip/PageSidebar'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Privacy policy · BipHub',
  description:
    'How BipHub processes personal data for EU users. We use no analytics, no third-party trackers, and no marketing pixels. Essential session cookies only.',
  alternates: { canonical: 'https://biphub.eu/privacy' },
}

const SECTIONS = [
  { id: 'data-controller', label: 'Data Controller' },
  { id: 'what-we-collect', label: 'What we collect' },
  { id: 'legal-basis', label: 'Legal basis' },
  { id: 'retention', label: 'Retention' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'how-to-exercise', label: 'How to exercise' },
  { id: 'children', label: 'Children' },
  { id: 'updates', label: 'Updates' },
] as const

export default function PrivacyPage() {
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
            Privacy <span className="text-eu-gold">policy</span>
          </h1>
          <p className="mt-6 max-w-[62ch] text-[18px] leading-relaxed text-white/70">
            How BipHub processes personal data for EU users. No analytics, no third-party trackers, no marketing pixels — essential session cookies only, and everything else stays on your device or in your account.
          </p>
          <p className="mt-6 text-[13px] font-medium text-white/50">Last updated: 15th June 2026</p>
        </div>
      </section>

      {/* === Article body === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <PageSidebar sections={SECTIONS} />
          </aside>

          <article className="min-w-0">
            {/* Section 1 */}
            <section id="data-controller" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 1 · Data Controller</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Data Controller</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  Hexona Systems operates BipHub as an independent open-source project. The data controller for personal data processed through this site is Hexona Systems. For privacy questions or to exercise your rights under GDPR Articles 15–17, contact us at{' '}
                  <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
                    biphub.org@gmail.com
                  </a>
                  .
                </p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="what-we-collect" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 2 · What we collect</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">What we collect</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  <strong className="text-ink">Supabase Auth session cookies (essential).</strong> When you sign in as a university coordinator, our authentication provider (Supabase) sets HTTP-only cookies that keep you signed in across page loads. These cookies are strictly necessary for the sign-in feature to function and are exempt from consent under EU ePrivacy rules.
                </p>
                <p>
                  <strong className="text-ink">Saved BIPs.</strong> When a signed-in student saves a BIP, we store a <code>saved_bips</code> table row containing your user ID, the BIP&apos;s internal ID, and the timestamp of the save (<code>saved_at</code>). This data is stored in Supabase (EU region) and is used solely to sync your saved BIPs across devices. It is retained until you remove the BIP from your saved list or delete your account. All <code>saved_bips</code> rows are permanently deleted when you delete your account (cascading deletion via foreign key). No saved-BIP data is shared with third parties.
                </p>
                <p>
                  <strong className="text-ink">Legacy bookmark sweep.</strong> On first sign-in, the app reads any <code>biphub:bookmarks</code> value previously stored in your browser&apos;s <code>localStorage</code> (from an earlier version of BipHub), migrates valid BIP IDs into your server-side saved list, then immediately clears the <code>localStorage</code> key. After this one-time sweep the key is not written again.
                </p>
                <p>
                  <strong className="text-ink">Local browser storage.</strong> The <code>bip-draft</code> key holds an in-progress BIP submission so you do not lose your work if your session expires mid-form. This data is essential to the feature it supports and remains on your device only.
                </p>
                <p>
                  <strong className="text-ink">Coordinator profile and submission content.</strong> When a university coordinator registers, we store their full name, contact email, university affiliation, and Erasmus institutional code. When they submit a BIP, we store the submission content (programme title, description, dates, contact details they wish to publish, and so on). Approved submissions are published as part of the public Erasmus+ directory.
                </p>
                <p>
                  <strong className="text-ink">Alert preferences.</strong> When a signed-in student saves alert preferences, we store a single <code>bip_alert_preferences</code> row with your user ID, your chosen fields of study and/or countries (any number), frequency (<code>weekly</code> or <code>daily</code>), the explicit consent text you agreed to, and update time. This is used solely to send you the digest emails you requested.
                </p>
                <p>
                  <strong className="text-ink">Alert deliveries.</strong> Each time we send you a digest, we store a <code>bip_alert_deliveries</code> row (BIP ID + your user ID + delivery time) so the same BIP is never emailed twice. Both surfaces are retained until you clear your preferences or delete your account. All <code>bip_alert_preferences</code> and <code>bip_alert_deliveries</code> rows are permanently deleted when you delete your account (cascading deletion via foreign key). You can unsubscribe at any time via the link in the email (no sign-in required) or from your dashboard.
                </p>
                <p>
                  <strong className="text-ink">No analytics.</strong> We run no analytics scripts, no third-party trackers, no marketing pixels, no advertising cookies. We do not measure your behaviour. This is by design — the cheapest GDPR-compliant path is to collect nothing.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section id="legal-basis" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 3 · Legal basis</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Legal basis</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  For coordinator accounts, the legal basis is contract performance (Art 6(1)(b) GDPR) — we cannot operate the directory without storing the account. For published BIP submissions, the legal basis is legitimate interest (Art 6(1)(f) GDPR) in maintaining a public Erasmus+ directory benefiting students across Europe. We do not rely on consent for any data processing in v1 because we collect no consent-requiring data.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="retention" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 4 · Retention</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Retention</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  Account data is retained until you delete your account from <code>/dashboard/settings</code>. When you delete your account, drafts and pending/rejected submissions are deleted; approved BIPs are anonymized (contact name and email are removed) and remain in the public directory as institutional information. Session cookies expire when you sign out or when their issuer&apos;s policy expires them.
                </p>
              </div>
            </section>

            {/* Section 5 */}
            <section id="your-rights" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 5 · Your rights</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Your rights</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  Under GDPR you have the right of access (Art 15) to a copy of your personal data, the right of rectification (Art 16) to correct inaccurate data, and the right of erasure (Art 17) to have your data deleted. The right of erasure is exercised in-product via the Delete account button at <code>/dashboard/settings</code>. For access or rectification requests, email{' '}
                  <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
                    biphub.org@gmail.com
                  </a>{' '}
                  — we respond within 30 days.
                </p>
              </div>
            </section>

            {/* Section 6 */}
            <section id="how-to-exercise" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 6 · How to exercise your rights</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">How to exercise your rights</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  In-product: open <code>/dashboard/settings</code> while signed in and use the Danger zone — Delete account. By email: write to{' '}
                  <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
                    biphub.org@gmail.com
                  </a>{' '}
                  from the email address on your account. We may ask for additional information to verify your identity before acting on a request affecting personal data.
                </p>
              </div>
            </section>

            {/* Section 7 */}
            <section id="children" className="mb-20 scroll-mt-24">
              <Eyebrow className="mb-3">Section 7 · Children</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Children</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  BipHub is designed for higher-education students enrolled in Erasmus+-participating institutions. We do not knowingly process the personal data of children under 16 and we do not target children in any of our content.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section id="updates" className="mb-16 scroll-mt-24">
              <Eyebrow className="mb-3">Section 8 · Updates</Eyebrow>
              <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">Updates</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-ink-2">
                <p>
                  We may update this policy as the product evolves. Material changes will be reflected on this page with an updated date stamp at the top. We do not currently maintain a public change log; if you need to see past versions, write to{' '}
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
