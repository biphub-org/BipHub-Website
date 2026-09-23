/**
 * AccountDeletedEmail — receipt sent to the account email when a BipHub
 * account is deleted, whether the user deleted it themselves
 * (initiatedBy 'self', deleteAccountAction) or an admin removed it
 * (initiatedBy 'admin', removeUserAction).
 *
 * Sent BEFORE the auth row is gone in the self-deletion path (the address
 * comes from the session claims) and BEFORE the RPC fires in the
 * admin-removal path — Resend delivery needs no live session.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface AccountDeletedEmailProps {
  initiatedBy: 'self' | 'admin'
  fullName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function AccountDeletedEmail({
  initiatedBy,
  fullName,
  siteOrigin = 'https://biphub.eu',
}: AccountDeletedEmailProps) {
  const contactUrl = `${siteOrigin}/contact`
  const byAdmin = initiatedBy === 'admin'

  return (
    <EmailShell
      preview="Your BipHub account has been deleted"
      eyebrow="ACCOUNT"
      title="Your BipHub account has been deleted"
      cta={{ href: contactUrl, label: 'Contact the BipHub team →' }}
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
        {byAdmin
          ? 'A BipHub administrator has removed your account. Your personal data has been deleted; listings you published remain visible in anonymized form.'
          : 'As requested, your BipHub account and personal data have been deleted. Listings you published remain visible in anonymized form.'}
      </Text>
      {byAdmin ? (
        <Text
          style={{
            fontSize: T.bodySize,
            color: T.ink,
            lineHeight: T.bodyLineHeight,
            marginTop: T.smallGap,
          }}
        >
          If you believe this was a mistake, please contact us and we will
          look into it.
        </Text>
      ) : null}
    </EmailShell>
  )
}
