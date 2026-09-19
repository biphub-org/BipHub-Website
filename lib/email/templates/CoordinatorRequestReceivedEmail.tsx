/**
 * CoordinatorRequestReceivedEmail — confirmation sent to the requester's
 * temporary contact email right after a coordinator access request is filed.
 *
 * Tells them the request is under review and what happens next (an admin
 * decision email / invite link arrives at the account email on approval).
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
  Hr,
  Preview,
} from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'

export interface CoordinatorRequestReceivedEmailProps {
  fullName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function CoordinatorRequestReceivedEmail({
  fullName,
  siteOrigin = 'https://biphub.eu',
}: CoordinatorRequestReceivedEmailProps) {
  const loginUrl = `${siteOrigin}/login`

  return (
    <Html>
      <Head />
      <Preview>We received your BipHub coordinator request</Preview>
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
            COORDINATOR ACCESS
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
            Request received
          </Heading>

          <div style={{ height: T.gap }} />

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
            Thanks for your interest in listing your university&apos;s Blended
            Intensive Programmes on BipHub. Your coordinator access request is
            now under review.
          </Text>
          <Text
            style={{
              fontSize: T.bodySize,
              color: T.ink,
              lineHeight: T.bodyLineHeight,
              marginTop: T.smallGap,
            }}
          >
            We&apos;ll email you once an admin approves it — then you&apos;ll
            set your password and sign in. Trying to sign in before then will
            show the same &quot;under review&quot; status.
          </Text>

          <div style={{ height: '24px' }} />

          <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
            You can check your status any time at{' '}
            <a href={loginUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
              BipHub login
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
