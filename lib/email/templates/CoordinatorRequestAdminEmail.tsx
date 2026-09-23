/**
 * CoordinatorRequestAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a prospective coordinator files an
 * access request.
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts):
 *   "New coordinator request: {fullName} ({university})".
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface CoordinatorRequestAdminEmailProps {
  fullName: string
  accountEmail: string
  universityName: string
  erasmusCode: string
  /** ISO 8601 timestamp; rendered as a human-readable date+time in en-GB locale. */
  submittedAt: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function CoordinatorRequestAdminEmail({
  fullName,
  accountEmail,
  universityName,
  erasmusCode,
  submittedAt,
  siteOrigin = 'https://biphub.eu',
}: CoordinatorRequestAdminEmailProps) {
  const reviewUrl = `${siteOrigin}/admin/coordinators/requests`
  let submitted = submittedAt
  try {
    const d = new Date(submittedAt)
    if (!Number.isNaN(d.getTime())) {
      submitted = `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    }
  } catch {
    submitted = submittedAt
  }

  return (
    <EmailShell
      preview={`New coordinator request: ${fullName || accountEmail}`}
      eyebrow="ADMIN NOTIFICATION"
      title="New coordinator request"
      cta={{ href: reviewUrl, label: 'Review request →' }}
    >
      {/* Body */}
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          margin: 0,
        }}
      >
        A prospective coordinator asked for access and is waiting for your review.
      </Text>

      <div style={{ height: T.gap }} />

      <Text style={{ fontSize: T.bodySize, color: T.ink, margin: 0 }}>
        <strong>Name:</strong> {fullName || 'Unknown'}
      </Text>
      <Text style={{ fontSize: T.bodySize, color: T.ink, marginTop: T.smallGap }}>
        <strong>Email:</strong> {accountEmail}
      </Text>
      <Text style={{ fontSize: T.bodySize, color: T.ink, marginTop: T.smallGap }}>
        <strong>University:</strong>{' '}
        {universityName || 'Unknown'}
        {erasmusCode ? ` (${erasmusCode})` : ''}
      </Text>
      <Text style={{ fontSize: T.bodySize, color: T.ink, marginTop: T.smallGap }}>
        <strong>Submitted:</strong> {submitted}
      </Text>
    </EmailShell>
  )
}
