/**
 * AdminNotificationEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a coordinator submits a BIP for review
 * (ADMN-11 / D-14).
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts) from
 * the bipTitle prop so each notification carries the actual title:
 *   "New BIP pending review: {bipTitle}".
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 03-CONTEXT.md D-14; 03-UI-SPEC.md Email Template Visual Contract.
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'
import { formatLongDate } from '@/lib/utils/dates'

export interface AdminNotificationEmailProps {
  bipTitle: string
  bipId: string
  coordinatorName: string
  coordinatorUniversity: string
  /** ISO 8601 timestamp; rendered as a human-readable date+time in en-GB locale. */
  submittedAt: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const longDate = formatLongDate(iso) ?? iso
    const time = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${longDate}, ${time}`
  } catch {
    return iso
  }
}

export function AdminNotificationEmail({
  bipTitle,
  bipId,
  coordinatorName,
  coordinatorUniversity,
  submittedAt,
  siteOrigin = 'https://biphub.eu',
}: AdminNotificationEmailProps) {
  const reviewUrl = `${siteOrigin}/admin/bips/${bipId}/review`

  return (
    <EmailShell
      preview={`New BIP pending review: ${bipTitle}`}
      eyebrow="ADMIN NOTIFICATION"
      title="New BIP pending review"
      cta={{ href: reviewUrl, label: 'Review submission →' }}
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
        A new BIP has been submitted and is waiting for your review.
      </Text>

      <div style={{ height: T.gap }} />

      <Text style={{ fontSize: T.bodySize, color: T.ink, margin: 0 }}>
        <strong>Title:</strong> {bipTitle}
      </Text>
      <Text style={{ fontSize: T.bodySize, color: T.ink, marginTop: T.smallGap }}>
        <strong>Coordinator:</strong>{' '}
        {coordinatorName || 'Unknown'} ({coordinatorUniversity || 'Unaffiliated'})
      </Text>
      <Text style={{ fontSize: T.bodySize, color: T.ink, marginTop: T.smallGap }}>
        <strong>Submitted:</strong> {formatTimestamp(submittedAt)}
      </Text>
    </EmailShell>
  )
}
