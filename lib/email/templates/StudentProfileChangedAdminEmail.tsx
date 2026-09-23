/**
 * StudentProfileChangedAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a student edits their own profile,
 * carrying the before → after diff.
 *
 * Only actual changes trigger it — untouched saves stay silent (the action
 * layer enforces this, not the template).
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

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
    <EmailShell
      preview={`Student profile updated: ${studentName || studentEmail}`}
      eyebrow="ADMIN NOTIFICATION"
      title="Student profile updated"
    >
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
    </EmailShell>
  )
}
