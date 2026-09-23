import { render } from '@react-email/components'
import { Section, Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export type AlertDigestProps = {
  field?: string | null
  country?: string | null
  frequency: string
  bips: Array<{ slug: string; title: string; hostName: string; hostCity?: string | null; ects?: number | null }>
  unsubscribeUrl: string
  siteUrl: string
}

/**
 * AlertDigest — BIP alert digest (daily/weekly), sent by the
 * send-bip-alerts edge function.
 *
 * Chrome comes from EmailShell (the shared no-reply template); the BIP
 * rows and the unsubscribe line are digest-specific content.
 */
export function AlertDigest({ field, country, frequency, bips, unsubscribeUrl, siteUrl }: AlertDigestProps) {
  const criteria = [field, country].filter(Boolean).join(' · ') || 'all BIPs'
  const browseUrl = `${siteUrl}/bips`
  const dashboardUrl = `${siteUrl}/student-dashboard`

  return (
    <EmailShell
      preview={
        bips.length === 1 ? '1 new BIP matches your alert' : `${bips.length} new BIPs match your alert`
      }
      eyebrow="BIP ALERTS"
      title="New BIPs matching your alert"
      cta={{ href: browseUrl, label: 'Browse all BIPs →' }}
      afterCta={
        <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
          <a href={unsubscribeUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
            Unsubscribe from this alert
          </a>{' '}
          — or manage all alerts in your{' '}
          <a href={dashboardUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
            dashboard
          </a>
          .
        </Text>
      }
    >
      <Text
        style={{
          fontSize: T.smallSize,
          color: T.muted,
          lineHeight: T.smallLineHeight,
          margin: 0,
        }}
      >
        {criteria} — {frequency} digest.
      </Text>

      <div style={{ height: T.gap }} />

      {/* BIP rows */}
      {bips.map((b) => {
        const meta = [b.hostName, b.hostCity, b.ects != null ? `${b.ects} ECTS` : null]
          .filter(Boolean)
          .join(' · ')
        return (
          <Section
            key={b.slug}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: T.borderRadius,
              padding: '16px',
              marginBottom: '12px',
            }}
          >
            <a
              href={`${siteUrl}/bip/${b.slug}`}
              style={{
                fontSize: T.bodySize,
                fontWeight: T.semiboldWeight,
                color: T.euBlue,
                textDecoration: 'none',
              }}
            >
              {b.title}
            </a>
            {meta ? (
              <Text
                style={{
                  fontSize: T.smallSize,
                  color: T.muted,
                  lineHeight: T.smallLineHeight,
                  marginTop: '4px',
                  marginBottom: 0,
                }}
              >
                {meta}
              </Text>
            ) : null}
          </Section>
        )
      })}
    </EmailShell>
  )
}

export async function renderAlertDigest(props: AlertDigestProps): Promise<string> {
  return await render(<AlertDigest {...props} />)
}
