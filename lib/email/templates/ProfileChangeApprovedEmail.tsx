/**
 * ProfileChangeApprovedEmail — sent to the coordinator's (new) contact email
 * when an admin approves their data-change request.
 *
 * The profile already carries the new values; this is a confirmation with an
 * optional admin note. EC disclaimer in footer is MANDATORY (CLAUDE.md).
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
    <Html>
      <Head />
      <Preview>Your BipHub profile change was approved</Preview>
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
            PROFILE UPDATE
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
            Profile change approved
          </Heading>

          <div style={{ height: T.gap }} />

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

          {note && (
            <Text
              style={{
                fontSize: T.bodySize,
                color: T.ink,
                lineHeight: T.bodyLineHeight,
                marginTop: T.smallGap,
                borderLeft: `4px solid ${T.euGold}`,
                paddingLeft: '12px',
              }}
            >
              Note from the BipHub team: {note}
            </Text>
          )}

          <div style={{ height: '24px' }} />

          <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
            You can review your details any time at{' '}
            <a href={settingsUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
              dashboard settings
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
