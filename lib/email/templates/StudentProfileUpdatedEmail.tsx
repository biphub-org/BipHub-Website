/**
 * StudentProfileUpdatedEmail — confirmation sent to the student when they
 * save changes to their own profile (updateStudentProfileAction). The admin
 * inbox gets the before → after diff via StudentProfileChangedAdminEmail;
 * the student just needs a receipt plus a link back to the dashboard.
 *
 * Only sent when at least one field actually changed — untouched saves stay
 * silent, mirroring the admin-notification contract.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface StudentProfileUpdatedEmailProps {
  fullName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function StudentProfileUpdatedEmail({
  fullName,
  siteOrigin = 'https://biphub.eu',
}: StudentProfileUpdatedEmailProps) {
  const dashboardUrl = `${siteOrigin}/student-dashboard`

  return (
    <EmailShell
      preview="Your BipHub profile was updated"
      eyebrow="PROFILE"
      title="Your profile was updated"
      cta={{ href: dashboardUrl, label: 'Open your dashboard →' }}
    >
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
        Your BipHub profile changes have been saved. If you did not make
        these changes, please reset your password and contact us right away.
      </Text>
    </EmailShell>
  )
}
