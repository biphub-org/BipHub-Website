/**
 * ProfileChangeRequestAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a coordinator files a profile
 * data-change request.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface ProfileChangeRequestAdminEmailProps {
  coordinatorName: string
  coordinatorEmail: string
  universityName: string
  erasmusCode: string
  /** ISO 8601 timestamp; rendered as a human-readable date+time in en-GB locale. */
  submittedAt: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function ProfileChangeRequestAdminEmail({
  coordinatorName,
  coordinatorEmail,
  universityName,
  erasmusCode,
  submittedAt,
  siteOrigin = 'https://biphub.eu',
}: ProfileChangeRequestAdminEmailProps) {
  const inboxUrl = `${siteOrigin}/admin/coordinators/data-changes`

  return (
    <EmailShell
      preview={`New profile data-change request: ${coordinatorName || coordinatorEmail}`}
      eyebrow="ADMIN NOTIFICATION"
      title="New profile data-change request"
    >
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        {coordinatorName || 'A coordinator'} ({coordinatorEmail}) requested
        a profile data change{universityName ? ` for ${universityName}` : ''}
        {erasmusCode ? ` (${erasmusCode})` : ''}.
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        Submitted {formatSubmittedAt(submittedAt)}. Review it in the{' '}
        <a href={inboxUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
          data-changes inbox
        </a>
        .
      </Text>
    </EmailShell>
  )
}
