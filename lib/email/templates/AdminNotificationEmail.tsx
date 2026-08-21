/**
 * AdminNotificationEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a coordinator submits a BIP for review
 * (ADMN-11 / D-14).
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts) from
 * the bipTitle prop so each notification carries the actual title:
 *   "New BIP pending review: {bipTitle}".
 *
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 03-CONTEXT.md D-14; 03-UI-SPEC.md Email Template Visual Contract.
 */
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
} from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
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
    <Html>
      <Head />
      <Preview>New BIP pending review: {bipTitle}</Preview>
      <Body
        style={{
          backgroundColor: T.bgSoft,
          fontFamily: T.fontFamily,
          margin: 0,
          padding: '32px 16px',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: T.borderRadius,
            padding: '32px',
          }}
        >
          {/* Header */}
          <Text style={{ fontSize: '22px', fontWeight: 700, color: T.euBlue, margin: 0 }}>
            BipHub
          </Text>
          <Text
            style={{
              fontSize: '11px',
              color: T.euBlue,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginTop: '4px',
            }}
          >
            ADMIN NOTIFICATION
          </Text>

          <div style={{ height: T.gap }} />

          {/* H1 */}
          <Heading
            as="h1"
            style={{
              fontSize: T.headingSize,
              fontWeight: T.headingWeight,
              color: T.ink,
              lineHeight: 1.25,
              margin: 0,
            }}
          >
            New BIP pending review
          </Heading>

          <div style={{ height: T.gap }} />

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

          <div style={{ height: '24px' }} />

          {/* Primary CTA */}
          <Button
            href={reviewUrl}
            style={{
              backgroundColor: T.euBlue,
              color: T.white,
              padding: '12px 24px',
              borderRadius: T.pillRadius,
              fontSize: T.smallSize,
              fontWeight: T.semiboldWeight,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Review submission →
          </Button>

          <Hr style={{ borderTop: `1px solid ${T.border}`, margin: '32px 0 16px 0' }} />

          {/* EC disclaimer — MANDATORY per CLAUDE.md */}
          <Text style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
            Independent project — not affiliated with the European Commission
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
