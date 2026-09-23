/**
 * EmailShell — the single shared chrome for every no-reply email
 * (lib/email/send.ts templates, from BipHub <no-reply@biphub.org>).
 *
 * Every template renders through this component so the family cannot drift:
 * soft-background body, white 600px card, blue BipHub header + uppercase
 * eyebrow, H1 title, optional blue pill CTA, gold-note callouts via
 * EmailNote, and the MANDATORY EC disclaimer footer (CLAUDE.md never-do).
 *
 * Templates own ONLY their content: preview/eyebrow/title strings, body
 * children, an optional CTA, and optional after-CTA content (secondary
 * links). Body copy, recipient logic, and subjects stay in each template
 * and lib/email/send.ts respectively.
 *
 * Source: 03-UI-SPEC.md Email Template Visual Contract; EMAIL_TOKENS.
 */
import * as React from 'react'
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

export type EmailCta = {
  href: string
  label: React.ReactNode
}

export interface EmailShellProps {
  preview: string
  eyebrow: string
  title: string
  cta?: EmailCta
  /** Secondary content rendered between the CTA and the footer rule. */
  afterCta?: React.ReactNode
  children: React.ReactNode
}

export function EmailShell({ preview, eyebrow, title, cta, afterCta, children }: EmailShellProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
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
            {eyebrow}
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
            {title}
          </Heading>

          <div style={{ height: T.gap }} />

          {children}

          {cta ? (
            <>
              <div style={{ height: '24px' }} />

              {/* Primary CTA */}
              <Button
                href={cta.href}
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
                {cta.label}
              </Button>

              {afterCta ? (
                <>
                  <div style={{ height: T.gap }} />
                  {afterCta}
                </>
              ) : null}
            </>
          ) : null}

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

/**
 * EmailNote — gold left-border + bg-soft callout for admin notes, reviewer
 * feedback, and team messages (UI-SPEC). The body is caller-rendered so
 * per-template text styling (e.g. pre-wrap verbatim feedback) is preserved.
 */
export function EmailNote({
  title,
  children,
}: {
  title: React.ReactNode
  children: React.ReactNode
}) {
  return (
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
        {title}
      </Text>
      {children}
    </Section>
  )
}
