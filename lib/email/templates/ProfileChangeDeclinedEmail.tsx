/**
 * ProfileChangeDeclinedEmail — coordinator notification when their profile
 * data-change request is declined. The admin note is the only explanation
 * the coordinator receives, so it renders verbatim in the gold callout.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface ProfileChangeDeclinedEmailProps {
  coordinatorName: string
  /** Reason the admin gave — rendered verbatim in the gold callout. */
  adminNote?: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function ProfileChangeDeclinedEmail({
  coordinatorName,
  adminNote = '',
  siteOrigin = 'https://biphub.eu',
}: ProfileChangeDeclinedEmailProps) {
  const settingsUrl = `${siteOrigin}/dashboard/settings`
  const note = adminNote.trim()

  return (
    <EmailShell
      preview="Your BipHub profile change was declined"
      eyebrow="PROFILE UPDATE"
      title="Profile change declined"
    >
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        Hi {coordinatorName || 'there'},
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        An admin declined your profile data-change request, so your
        profile details stay exactly as they were. You can file a new
        request from your dashboard settings at any time.
      </Text>

      {note ? (
        <EmailNote title="Note from the BipHub team">
          <Text
            style={{
              fontSize: T.bodySize,
              color: T.ink,
              lineHeight: T.bodyLineHeight,
              marginTop: '4px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {note}
          </Text>
        </EmailNote>
      ) : null}

      <div style={{ height: '24px' }} />

      <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
        File a new request from{' '}
        <a href={settingsUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
          dashboard settings
        </a>
        .
      </Text>
    </EmailShell>
  )
}
