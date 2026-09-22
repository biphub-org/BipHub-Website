/**
 * StudentProfileChangedAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a student edits their profile in the
 * student dashboard, showing the before → after for every changed field.
 * Only changed fields are passed in `changes` — unchanged values never
 * render as a diff.
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts):
 *   "Student profile updated: {name}".
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

export interface StudentProfileFieldChange {
  label: string
  before: string
  after: string
}

export interface StudentProfileChangedAdminEmailProps {
  studentName: string
  studentEmail: string
  changes: StudentProfileFieldChange[]
  /** ISO 8601 timestamp; rendered as a human-readable date+time in en-GB locale. */
  updatedAt: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

function formatUpdatedAt(iso: string): string {
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

export function StudentProfileChangedAdminEmail({
  studentName,
  studentEmail,
  changes,
  updatedAt,
  siteOrigin = 'https://biphub.eu',
}: StudentProfileChangedAdminEmailProps) {
  const dashboardUrl = `${siteOrigin}/admin/students`

  return (
    <Html>
      <Head />
      <Preview>
        Student profile updated: {studentName || studentEmail}
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
            Student profile updated
          </Heading>

          <div style={{ height: T.gap }} />

          <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
            {studentName || 'A student'} ({studentEmail}) changed their profile
            on {formatUpdatedAt(updatedAt)}:
          </Text>

          <div style={{ height: T.smallGap }} />

          {changes.map((change) => (
            <Text
              key={change.label}
              style={{
                fontSize: T.bodySize,
                color: T.ink,
                lineHeight: T.bodyLineHeight,
                margin: `0 0 ${T.smallGap} 0`,
              }}
            >
              <strong>{change.label}:</strong>{' '}
              <span style={{ textDecoration: 'line-through', color: T.muted }}>
                {change.before}
              </span>{' '}
              → {change.after}
            </Text>
          ))}

          <Text
            style={{
              fontSize: T.bodySize,
              color: T.ink,
              lineHeight: T.bodyLineHeight,
              marginTop: T.smallGap,
            }}
          >
            Review it in the{' '}
            <a href={dashboardUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
              students admin
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
