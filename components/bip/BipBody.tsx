import Link from 'next/link'
import { getCountryName } from '@/lib/countries'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { CountryFlag } from '@/components/ui/country-flag'
import { cn } from '@/lib/utils/cn'
import { attachmentPublicUrl } from '@/lib/utils/attachments'
import { formatLongDateRange, formatLongDates } from '@/lib/utils/dates'

/**
 * BipBody — RSC. Stacked content sections for the BIP detail page.
 *
 * Sections (conditional — only rendered when data is non-empty):
 *   1. About this programme  (description)
 *   2. What you'll learn     (learning_outcomes, bulleted list)
 *   3. Virtual component     (virtual_component_description + Timing)
 *   4. Physical mobility     (host_city · start_date–end_date)
 *   5. Partner universities  (registered FK + free-text raw with "(unverified)")
 *   6. Who can apply         (eligibility_notes + study_levels chips)
 *   7. How to apply          (url → external link, contact → mailto, else prose)
 *
 * Typography per UI-SPEC line 79:
 *   - h2: text-[22px] font-bold tracking-[-0.3px] leading-[1.25]
 *   - body: text-base (16px) / leading-relaxed / text-ink-2
 *   - 32px gap (gap-8) between sections
 */

interface SectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

function Section({ title, children, className }: SectionProps) {
  return (
    <section className={cn('pt-8 first:pt-0', className)}>
      <h2 className="text-[22px] font-bold text-ink tracking-[-0.3px] leading-[1.25] mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function BipBody({ bip }: { bip: BipDetail }) {
  // Learning outcomes: split on one or more newlines
  const learningOutcomeLines = bip.learning_outcomes
    ? bip.learning_outcomes.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    : []

  // Study level chips
  const studyLevels = bip.study_levels ?? []

  // Partner chip display (DETL-03, D-14)
  const partners = bip.partners ?? []

  // Date range display for physical mobility
  const mobilityDates = formatLongDateRange(
    bip.physical_start_date,
    bip.physical_end_date,
  )

  // Optional uploaded media/documents (item #18)
  const attachments = bip.attachments ?? []

  // Virtual session dates, formatted as "10th January 2026"
  const virtualSessionDates = formatLongDates(bip.virtual_session_dates)

  return (
    <div className="divide-y divide-border break-words">

      {/* 1. About this programme */}
      {bip.description && (
        <Section title="About this programme">
          <p className="text-base text-ink-2 leading-relaxed whitespace-pre-line">
            {bip.description}
          </p>
        </Section>
      )}

      {/* 2. What you'll learn */}
      {learningOutcomeLines.length > 0 && (
        <Section title="What you'll learn">
          <ul className="list-disc list-inside space-y-2 text-base text-ink-2 leading-relaxed">
            {learningOutcomeLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* 3. Virtual component */}
      {bip.virtual_component_description && (
        <Section title="Virtual component">
          <p className="text-base text-ink-2 leading-relaxed mb-3">
            {bip.virtual_component_description}
          </p>
          {bip.virtual_timing && (
            <p className="text-sm text-muted">
              Timing: {bip.virtual_timing}
            </p>
          )}
          {virtualSessionDates && (
            <p className="text-sm text-muted">
              {bip.virtual_session_dates && bip.virtual_session_dates.length > 1
                ? 'Session dates: '
                : 'Session date: '}
              {virtualSessionDates}
            </p>
          )}
        </Section>
      )}

      {/* 4. Physical mobility */}
      {(bip.host_city || mobilityDates) && (
        <Section title="Physical mobility">
          <p className="text-base text-ink-2 leading-relaxed">
            {[bip.host_city, mobilityDates].filter(Boolean).join(' · ')}
          </p>
        </Section>
      )}

      {/* 5. Partner universities (DETL-03, D-14) */}
      {partners.length > 0 && (
        <Section title="Partner universities">
          <div className="flex flex-wrap gap-2">
            {partners.map((partner) => {
              if (partner.university) {
                // Registered partner with FK
                const code = partner.university.country
                const partnerCountry = code ? getCountryName(code) : null
                return (
                  <span
                    key={partner.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-eu-blue-50 text-eu-blue text-sm font-semibold"
                  >
                    {code && <CountryFlag code={code} width={16} />}
                    {partner.university.name}
                    {partnerCountry && ` (${partnerCountry})`}
                    {partner.university.erasmus_code && (
                      <span className="text-xs font-normal text-muted ml-0.5">
                        · {partner.university.erasmus_code}
                      </span>
                    )}
                  </span>
                )
              }

              // Free-text raw partner — show with "(unverified)" subscript (UI-SPEC line 276)
              if (partner.partner_name_raw) {
                const code = partner.partner_country_raw
                const rawCountry = code ? getCountryName(code) : null
                return (
                  <span
                    key={partner.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-eu-blue-50 text-eu-blue text-sm font-semibold"
                  >
                    {code && <CountryFlag code={code} width={16} />}
                    {partner.partner_name_raw}
                    {rawCountry && ` (${rawCountry})`}
                    <span className="text-xs font-normal text-muted ml-0.5">(unverified)</span>
                  </span>
                )
              }

              return null
            })}
          </div>
        </Section>
      )}

      {/* 6. Who can apply (DETL-04) */}
      {(bip.eligibility_notes || studyLevels.length > 0) && (
        <Section title="Who can apply">
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

      {/* Materials — uploaded visuals/documents (item #18) */}
      {attachments.length > 0 && (
        <Section title="Materials">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {attachments.map((a) => {
              const url = attachmentPublicUrl(a.storage_path)
              if (a.kind === 'image') {
                return (
                  <a
                    key={a.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-md border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={a.file_name}
                      className="h-32 w-full object-cover"
                    />
                  </a>
                )
              }
              if (a.kind === 'video') {
                return (
                  <video
                    key={a.id}
                    src={url}
                    controls
                    className="h-32 w-full rounded-md border border-border bg-black object-contain"
                  />
                )
              }
              return (
                <a
                  key={a.id}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-border bg-bg-soft p-2 text-center text-sm text-eu-blue hover:bg-eu-blue-50"
                >
                  <span className="truncate w-full" title={a.file_name}>
                    {a.file_name}
                  </span>
                  <span className="text-xs text-muted">Open document →</span>
                </a>
              )
            })}
          </div>
        </Section>
      )}

      {/* Fees */}
      {bip.fees && (
        <Section title="Fees">
          <p className="text-base text-ink-2 leading-relaxed whitespace-pre-line">
            {bip.fees}
          </p>
        </Section>
      )}

      {/* 7. How to apply (DETL-07) */}
      <Section title="How to apply">
        {bip.how_to_apply_type === 'url' && bip.how_to_apply_value ? (
          <Link
            href={bip.how_to_apply_value}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-1 px-5 py-3 rounded-pill font-semibold text-base',
              'bg-eu-blue text-white hover:bg-eu-blue-dark transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
            )}
          >
            Apply via host university →
          </Link>
        ) : bip.how_to_apply_type === 'contact' && bip.contact_email ? (
          <p className="text-base text-ink-2 leading-relaxed">
            Contact:{' '}
            {bip.contact_name && <span>{bip.contact_name} </span>}
            <a
              href={`mailto:${bip.contact_email}`}
              className="text-eu-blue hover:underline"
            >
              {bip.contact_email}
            </a>
            {bip.contact_phone && (
              <>
                {' · '}
                <a
                  href={`tel:${bip.contact_phone.replace(/\s+/g, '')}`}
                  className="text-eu-blue hover:underline"
                >
                  {bip.contact_phone}
                </a>
              </>
            )}
          </p>
        ) : (
          <p className="text-base text-muted">
            Application details coming soon. Check back nearer the deadline.
          </p>
        )}
      </Section>

    </div>
  )
}
