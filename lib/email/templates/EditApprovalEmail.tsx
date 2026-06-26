/**
 * EditApprovalEmail — coordinator notification when a BIP edit is approved (Phase 8 EDIT-07).
 *
 * Sent after admin approves a bip_edits row and the updated content goes live.
 * No admin note block — approval is clean/final.
 *
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 08-CONTEXT.md D-11; 08-UI-SPEC.md email copy; 08-PATTERNS.md EditApprovalEmail section.
 * Threat: T-08-08 mitigated by JSX text escaping (no dangerouslySetInnerHTML).
 */
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
  Preview,
} from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'

export interface EditApprovalEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditApprovalEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  siteOrigin = 'https://biphub.eu',
}: EditApprovalEmailProps) {
  const publicUrl = `${siteOrigin}/bip/${bipSlug}`

  return (
    <Html>
      <Head />
      <Preview>Your BIP edit is live on BipHub</Preview>
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
            BIP UPDATE
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
            Your BIP edit is live on BipHub
          </Heading>

          <div style={{ height: T.gap }} />

          {/* Body */}
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
            Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> has been approved and the updated version is now live.
          </Text>

          <div style={{ height: '24px' }} />

          {/* Primary CTA */}
          <Button
            href={publicUrl}
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
            View your BIP
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
