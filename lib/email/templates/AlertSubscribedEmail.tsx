/**
 * AlertSubscribedEmail — opt-in receipt sent to the student when BIP alert
 * preferences are created for the first time (saveAlertPreferencesAction).
 *
 * Only the creation event emails — later preference tweaks and opt-outs are
 * confirmed in-dashboard, so routine edits never generate mail. Summarises
 * the criteria + frequency and links the dashboard where alerts are managed.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface AlertSubscribedEmailProps {
  fullName: string
  fields: string[]
  countries: string[]
  frequency: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function AlertSubscribedEmail({
  fullName,
  fields,
  countries,
  frequency,
  siteOrigin = 'https://biphub.eu',
}: AlertSubscribedEmailProps) {
  const dashboardUrl = `${siteOrigin}/student-dashboard`
  const criteria = [...fields, ...countries].filter(Boolean).join(' · ') || 'all BIPs'

  return (
    <EmailShell
      preview="You subscribed to BIP alerts"
      eyebrow="BIP ALERTS"
      title="You subscribed to BIP alerts"
      cta={{ href: dashboardUrl, label: 'Manage your alerts →' }}
    >
      {/* Body */}
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        Hi {fullName || 'there'},
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        You will now receive a <strong>{frequency}</strong> digest when new
        BIPs match <strong>{criteria}</strong>.
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        You can change the frequency, narrow the criteria, or unsubscribe
        at any time from your dashboard — every digest also carries its own
        unsubscribe link.
      </Text>
    </EmailShell>
  )
}
