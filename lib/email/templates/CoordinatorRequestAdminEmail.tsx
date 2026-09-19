/**
 * CoordinatorRequestAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a prospective coordinator files an
 * access request.
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts):
 *   "New coordinator request: {fullName} ({university})".
 *
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
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
    <Html>
      <Head />
      <Preview>New coordinator request: {fullName || accountEmail}</Preview>
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
            New coordinator request
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
            Review request →
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
