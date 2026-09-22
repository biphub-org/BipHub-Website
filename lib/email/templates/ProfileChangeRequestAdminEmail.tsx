/**
 * ProfileChangeRequestAdminEmail — notifies ADMIN_NOTIFICATION_EMAIL when a
 * coordinator files a profile data-change request, so the data-changes inbox
 * doesn't sit unseen. Mirrors CoordinatorRequestAdminEmail.
 *
 * EC disclaimer in footer is MANDATORY (CLAUDE.md).
 */
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Hr,
  Preview,
} from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'

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
    <Html>
      <Head />
      <Preview>
        New profile data-change request: {coordinatorName || coordinatorEmail}
      </Preview>
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
            New profile data-change request
          </Heading>

          <div style={{ height: T.gap }} />

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
