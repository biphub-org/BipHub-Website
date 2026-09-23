/**
 * ProfileChangeApprovedEmail — coordinator notification when their profile
 * data-change request is approved and applied.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface ProfileChangeApprovedEmailProps {
  coordinatorName: string
  /** Optional note the admin attached to the approval. */
  adminNote?: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function ProfileChangeApprovedEmail({
  coordinatorName,
  adminNote = '',
  siteOrigin = 'https://biphub.eu',
}: ProfileChangeApprovedEmailProps) {
  const settingsUrl = `${siteOrigin}/dashboard/settings`
  const note = adminNote.trim()

  return (
    <EmailShell
      preview="Your BipHub profile change was approved"
      eyebrow="PROFILE UPDATE"
      title="Profile change approved"
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
        An admin approved your profile data-change request. Your new
        details are now live on your BipHub profile.
      </Text>

      {note ? (
        <EmailNote title="Note from the BipHub team">
          <Text
            style={{
              fontSize: T.bodySize,
              color: T.ink,
              lineHeight: T.bodyLineHeight,
              marginTop: '4px',
            }}
          >
            {note}
          </Text>
        </EmailNote>
      ) : null}

      <div style={{ height: '24px' }} />

      <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
        You can review your details any time at{' '}
        <a href={settingsUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
          dashboard settings
        </a>
        .
      </Text>
    </EmailShell>
  )
}
