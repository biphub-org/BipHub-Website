/**
 * EditRejectionEmail — coordinator notification when a BIP edit is rejected (Phase 8 EDIT-07).
 *
 * Admin note is rendered verbatim inside a gold left-border callout.
 * `whiteSpace: 'pre-wrap'` preserves admin formatting without HTML injection —
 * JSX escapes by default (T-08-08 mitigation; no dangerouslySetInnerHTML).
 *
 * The live BIP stays unchanged after edit rejection; the CTA points to the
 * edit form so the coordinator can review the note and revise.
 *
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 08-CONTEXT.md D-11; 08-UI-SPEC.md email copy; 08-PATTERNS.md EditRejectionEmail section.
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

export interface EditRejectionEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  /** Admin note rendered verbatim — JSX escaping prevents XSS (T-08-08) */
  adminNote: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditRejectionEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  adminNote,
  siteOrigin = 'https://biphub.eu',
}: EditRejectionEmailProps) {
  const editUrl = `${siteOrigin}/dashboard/bips/${bipSlug}/edit`

  return (
    <Html>
      <Head />
      <Preview>Your BIP edit was not approved</Preview>
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
            Your BIP edit was not approved
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
            Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> has been reviewed and was not approved.
            The live BIP remains unchanged.
          </Text>

          {/* Admin note callout — gold left border per UI-SPEC; renders verbatim */}
          <Section
            style={{
              borderLeft: `4px solid ${T.euGold}`,
              margin: `${T.gap} 0`,
              backgroundColor: T.bgSoft,
              padding: '12px 16px',
              borderRadius: '0 6px 6px 0',
            }}
          >
            <Text
              style={{
                fontSize: T.smallSize,
                fontWeight: T.semiboldWeight,
                color: T.ink2,
                margin: 0,
              }}
            >
              Reviewer feedback
            </Text>
            <Text
              style={{
                fontSize: T.bodySize,
                color: T.ink,
                lineHeight: T.bodyLineHeight,
                marginTop: '4px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {adminNote}
            </Text>
          </Section>

          <div style={{ height: '24px' }} />

          {/* Primary CTA — links to the edit form */}
          <Button
            href={editUrl}
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
            View your BIP dashboard
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
