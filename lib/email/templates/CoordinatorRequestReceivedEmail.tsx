/**
 * CoordinatorRequestReceivedEmail — confirmation sent to the requester's
 * temporary contact email right after a coordinator access request is filed.
 *
 * Tells them the request is under review and what happens next (an admin
 * decision email / invite link arrives at the account email on approval).
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

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
    <EmailShell
      preview="We received your BipHub coordinator request"
      eyebrow="COORDINATOR ACCESS"
      title="Request received"
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
    </EmailShell>
  )
}
