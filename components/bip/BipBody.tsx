import Link from 'next/link'
import {
  BookOpen,
  Target,
  Layers,
  Laptop,
  Building2,
  Users,
  UserCheck,
  BedDouble,
  Images,
  Wallet,
  HandCoins,
  Send,
  CalendarDays,
  MapPin,
  Clock,
  Leaf,
  HeartHandshake,
  Mail,
  Phone,
  type LucideIcon,
} from 'lucide-react'
import { getCountryName } from '@/lib/countries'
import { virtualTimingLabel } from '@/lib/constants/virtual-timing'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { CountryFlag } from '@/components/ui/country-flag'
import { cn } from '@/lib/utils/cn'
import { BipGallery } from '@/components/bip/BipGallery'
import {
  formatLongDate,
  formatLongDateRange,
  formatLongDates,
} from '@/lib/utils/dates'

/**
 * BipBody — RSC. Stacked content sections for the BIP detail page.
 *
 * Visual language mirrors /what-is-a-bip (icon-led section headers, card blocks,
 * a blue/gold two-card split for the programme format) so the page reads as
 * varied rather than plain text between dividers.
 *
 * Sections (conditional — only rendered when data is non-empty):
 *   1. About this programme  (description)
 *   2. What you'll learn     (learning_outcomes, bulleted list)
 *   3. Programme format      (virtual + physical, blue/gold card split)
 *   4. Universities involved (host card first, then registered FK partners and
 *                            free-text raw ones marked "unverified")
 *   5. Who can apply         (eligibility_notes + study_levels chips)
 *   6. Accommodation
 *   7. Materials             (uploaded visuals/documents)
 *   8. Fees
 *   9. Funding & support
 *  10. How to apply          (url → external link, contact → mailto, else prose)
 */

interface SectionProps {
  title: string
  icon: LucideIcon
  children: React.ReactNode
  className?: string
}

function Section({ title, icon: Icon, children, className }: SectionProps) {
  return (
    <section className={cn('scroll-mt-24', className)}>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue">
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <h2 className="text-[22px] font-bold text-ink tracking-[-0.3px] leading-[1.25]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/** Inclusive day count between two YYYY-MM-DD dates, or null. */
function durationDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (Number.isNaN(ms) || ms < 0) return null
  return Math.round(ms / 86_400_000) + 1
}

/**
 * One university in the consortium. The host is flagged so students can tell
 * where the on-site week happens; a free-text partner the coordinator typed in
 * rather than picking from the registry is marked unverified (D-14).
 */
function UniversityCard({
  name,
  countryCode,
  erasmusCode,
  role,
  unverified,
}: {
  name: string
  countryCode: string | null
  erasmusCode: string | null | undefined
  role: 'Host' | 'Partner'
  unverified?: boolean
}) {
  const countryName = countryCode ? getCountryName(countryCode) : null
  const isHost = role === 'Host'

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        // Same lift/shadow vocabulary as the listing BipCard. The border tint
        // follows the card's own role colour so the host stays gold on hover
        // rather than flipping to the partner blue.
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        isHost
          ? 'border-eu-gold/50 bg-eu-gold-soft/30 hover:border-eu-gold'
          : 'border-border bg-white hover:border-eu-blue',
      )}
    >
      {countryCode ? (
        <CountryFlag code={countryCode} width={22} />
      ) : (
        <Building2 size={20} strokeWidth={1.7} className="text-muted" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-ink">{name}</p>
        <p className="mt-0.5 text-xs text-muted">
          {[countryName, erasmusCode].filter(Boolean).join(' · ')}
        </p>
        <span
          className={cn(
            'mt-2 inline-flex rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            isHost ? 'bg-eu-gold text-ink' : 'bg-eu-blue-50 text-eu-blue',
          )}
        >
          {role}
        </span>
        {unverified && (
          <span className="ml-1.5 inline-flex rounded-pill bg-bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Unverified
          </span>
        )}
      </div>
    </li>
  )
}

/** One funding option — icon chip, title, and a single bounded line. */
function SupportCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <div className="group rounded-xl border border-border bg-white p-5 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-eu-blue hover:shadow-lg">
      {/* Icon chip warms to gold on card hover — the mockup's
          `.cat-item:hover .cat-item-icon` treatment. */}
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-colors duration-200 group-hover:bg-eu-gold group-hover:text-ink">
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h3 className="text-[15px] font-semibold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{body}</p>
    </div>
  )
}

/** A contact method in the apply block — pill-shaped so it reads as an action. */
function ContactLink({
  icon: Icon,
  href,
  label,
}: {
  icon: LucideIcon
  href: string
  label: string
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-pill border border-eu-blue/25 bg-white px-4 py-2 text-sm font-semibold text-eu-blue transition-all duration-200 hover:-translate-y-px hover:border-eu-blue/50 hover:bg-eu-blue-50 hover:shadow-sm"
    >
      <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
      {label}
    </a>
  )
}

/** One bounded fact row inside a format tile — icon + short text. */
function TileFact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-2">
      <Icon size={15} strokeWidth={1.8} className="shrink-0 text-muted" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export function BipBody({ bip }: { bip: BipDetail }) {
  // Learning outcomes: split on one or more newlines
  const learningOutcomeLines = bip.learning_outcomes
    ? bip.learning_outcomes.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    : []

  const studyLevels = bip.study_levels ?? []
  const partners = bip.partners ?? []
  const host = bip.host_university
  const mobilityDates = formatLongDateRange(
    bip.physical_start_date,
    bip.physical_end_date,
  )
  const attachments = bip.attachments ?? []
  const applicationDeadline = bip.application_deadline
    ? formatLongDate(bip.application_deadline)
    : null
  const virtualSessionDates = formatLongDates(bip.virtual_session_dates)

  const hasVirtual =
    !!bip.virtual_component_description ||
    !!virtualSessionDates ||
    !!bip.virtual_timing
  const hasPhysical = !!bip.host_city || !!mobilityDates

  return (
    <div className="break-words">
      {/* DETL-12 — partner-institutions-only flag (matches the /bips card badge) */}
      {bip.partner_institutions_only && (
        <div className="mb-10 rounded-xl border border-status-pending bg-status-pending-bg px-4 py-3">
          <p className="text-sm font-semibold text-status-pending">
            Open to partner institutions only
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            This programme accepts applicants from the host and its listed partner universities
            only — not the wider Erasmus+ network. Check with your home coordinator before applying.
          </p>
        </div>
      )}

      <div className="space-y-12">
        {/* 1. About this programme */}
        {bip.description && (
          <Section title="About this programme" icon={BookOpen}>
            <p className="text-base text-ink-2 leading-relaxed whitespace-pre-line">
              {bip.description}
            </p>
          </Section>
        )}

        {/* 2. What you'll learn */}
        {learningOutcomeLines.length > 0 && (
          <Section title="What you'll learn" icon={Target}>
            <ul className="space-y-2.5">
              {learningOutcomeLines.map((line, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-base leading-relaxed text-ink-2"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-eu-gold"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* 3. Programme format — virtual + physical.
             The two tiles hold ONLY bounded facts, so they stay balanced
             (equal height, no empty slack) whatever the content. The variable-
             length virtual description lives as full-width prose BELOW them. */}
        {(hasVirtual || hasPhysical) && (
          <Section title="Programme format" icon={Layers}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Online / virtual tile */}
              {hasVirtual && (
                <div className="group rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-eu-blue hover:shadow-lg">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-blue-50 text-eu-blue transition-transform duration-200 group-hover:scale-105">
                    <Laptop size={22} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    Online component
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                    {virtualTimingLabel(bip.virtual_timing) ?? 'Virtual learning'}
                  </p>
                  {virtualSessionDates && (
                    <div className="mt-3">
                      <TileFact icon={CalendarDays}>
                        {bip.virtual_session_dates &&
                        bip.virtual_session_dates.length > 1
                          ? 'Sessions: '
                          : 'Session: '}
                        {virtualSessionDates}
                      </TileFact>
                    </div>
                  )}
                </div>
              )}

              {/* On-site / physical tile */}
              {hasPhysical && (
                <div className="group rounded-xl border border-eu-gold/50 bg-eu-gold-soft/30 p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-eu-gold hover:shadow-lg">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-eu-gold text-ink transition-transform duration-200 group-hover:scale-105">
                    <Building2 size={22} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-ink">
                    On-site mobility
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-ink">
                    {mobilityDates ?? 'In person'}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {bip.host_city && <TileFact icon={MapPin}>{bip.host_city}</TileFact>}
                    {durationDays(bip.physical_start_date, bip.physical_end_date) && (
                      <TileFact icon={Clock}>
                        {durationDays(
                          bip.physical_start_date,
                          bip.physical_end_date,
                        )}{' '}
                        days on site
                      </TileFact>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Variable-length virtual description — full width, outside the tiles.
                 Labelled + tinted in the SAME blue as the online tile so it reads as
                 that tile's detail, not as loose prose belonging to both halves. */}
            {bip.virtual_component_description && (
              <div className="mt-4 rounded-r-lg border-l-[3px] border-eu-blue bg-eu-blue-50 px-5 py-4">
                <p className="mb-1.5 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-eu-blue">
                  <Laptop size={15} strokeWidth={1.9} aria-hidden="true" />
                  About the online component
                </p>
                <p className="text-base leading-relaxed text-ink-2 whitespace-pre-line">
                  {bip.virtual_component_description}
                </p>
              </div>
            )}
          </Section>
        )}

        {/* 4. Partner universities (DETL-03, D-14).
             The host leads the list — a consortium reads as "who is running
             this", and the host was otherwise only in the page header. Cards
             rather than chips: a university name is too long to sit in a pill
             alongside its country and Erasmus code without wrapping badly. */}
        {partners.length > 0 && (
          <Section title="Universities involved" icon={Users}>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {host && (
                <UniversityCard
                  name={host.name}
                  countryCode={host.country}
                  erasmusCode={host.erasmus_code}
                  role="Host"
                />
              )}
              {partners.map((partner) => {
                if (partner.university) {
                  return (
                    <UniversityCard
                      key={partner.id}
                      name={partner.university.name}
                      countryCode={partner.university.country}
                      erasmusCode={partner.university.erasmus_code}
                      role="Partner"
                    />
                  )
                }

                if (partner.partner_name_raw) {
                  return (
                    <UniversityCard
                      key={partner.id}
                      name={partner.partner_name_raw}
                      countryCode={partner.partner_country_raw}
                      erasmusCode={partner.partner_erasmus_code_raw}
                      role="Partner"
                      unverified
                    />
                  )
                }

                return null
              })}
            </ul>
          </Section>
        )}

        {/* 5. Who can apply (DETL-04) */}
        {(bip.eligibility_notes || studyLevels.length > 0) && (
          <Section title="Who can apply" icon={UserCheck}>
            {bip.eligibility_notes && (
              <p className="text-base text-ink-2 leading-relaxed mb-4">
                {bip.eligibility_notes}
              </p>
            )}
            {studyLevels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {studyLevels.map((level) => (
                  <span
                    key={level}
                    className="inline-flex items-center px-3 py-1 rounded-pill bg-eu-blue-50 text-eu-blue text-xs font-semibold capitalize"
                  >
                    {level}
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* 6. Accommodation (DETL-13) */}
        {bip.accommodation_notes && (
          <Section title="Accommodation" icon={BedDouble}>
            <p className="text-base text-ink-2 leading-relaxed whitespace-pre-line">
              {bip.accommodation_notes}
            </p>
          </Section>
        )}

        {/* 7. Materials — uploaded visuals/documents (item #18).
             One uniform row per attachment; media opens a lightbox. See BipGallery. */}
        {attachments.length > 0 && (
          <Section title="Visuals & documents" icon={Images}>
            <BipGallery attachments={attachments} />
          </Section>
        )}

        {/* 8. Fees */}
        {bip.fees && (
          <Section title="Fees" icon={Wallet}>
            <div className="rounded-xl border border-border bg-bg-soft p-5">
              <p className="text-base leading-relaxed text-ink-2 whitespace-pre-line">
                {bip.fees}
              </p>
            </div>
          </Section>
        )}

        {/* 9. Funding & support (DETL-14) — sending-institution framing.
             Same bounded-content rule as the format tiles: each card holds a
             title + one short line, so the pair stays balanced. The shared
             "claim it from your sending institution" caveat sits below both
             rather than being repeated inside each. */}
        {(bip.green_travel || bip.inclusion_support) && (
          <Section title="Funding & support" icon={HandCoins}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bip.green_travel && (
                <SupportCard
                  icon={Leaf}
                  title="Green travel top-up"
                  body="Extra Erasmus+ funding for reaching the BIP by low-emission transport."
                />
              )}
              {bip.inclusion_support && (
                <SupportCard
                  icon={HeartHandshake}
                  title="Inclusion support"
                  body="Additional funding for participants with fewer opportunities."
                />
              )}
            </div>
            <p className="mt-3 text-sm text-muted">
              Both are arranged and paid by your sending institution — not by the
              host university.
            </p>
          </Section>
        )}

        {/* 10. How to apply (DETL-07) — the page's closing CTA, so it carries
             more weight than a section of prose: a tinted block that states
             where applications go, repeats the deadline, and then acts. */}
        <Section title="How to apply" icon={Send}>
          <div className="rounded-xl border border-eu-blue-100 bg-eu-blue-50 p-6">
            {bip.how_to_apply_type === 'url' && bip.how_to_apply_value ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-ink">
                    Applications are handled by the host university.
                  </p>
                  {applicationDeadline && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
                      <CalendarDays
                        size={15}
                        strokeWidth={1.8}
                        className="shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      Apply by {applicationDeadline}
                    </p>
                  )}
                </div>
                <Link
                  href={bip.how_to_apply_value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'group inline-flex shrink-0 items-center gap-1 rounded-pill px-5 py-3 text-base font-semibold',
                    // The mockup's primary-button hover: 1px lift + shadow.
                    'bg-eu-blue text-white transition-all duration-200',
                    'hover:-translate-y-px hover:bg-eu-blue-dark hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
                  )}
                >
                  Apply via host university
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </div>
            ) : bip.how_to_apply_type === 'contact' && bip.contact_email ? (
              <div>
                <p className="text-base font-semibold text-ink">
                  Apply by contacting the programme coordinator
                  {bip.contact_name ? `, ${bip.contact_name}` : ''}.
                </p>
                {applicationDeadline && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-ink-2">
                    <CalendarDays
                      size={15}
                      strokeWidth={1.8}
                      className="shrink-0 text-muted"
                      aria-hidden="true"
                    />
                    Apply by {applicationDeadline}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <ContactLink
                    icon={Mail}
                    href={`mailto:${bip.contact_email}`}
                    label={bip.contact_email}
                  />
                  {bip.contact_phone && (
                    <ContactLink
                      icon={Phone}
                      href={`tel:${bip.contact_phone.replace(/\s+/g, '')}`}
                      label={bip.contact_phone}
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-base text-ink-2">
                Application details are coming soon — check back nearer the
                deadline.
              </p>
            )}
          </div>
        </Section>
      </div>
    </div>
  )
}
