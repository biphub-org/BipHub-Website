/**
 * CoordinatorRequestRejectedEmail — decision notice sent to the requester's
 * contact email when an admin rejects a coordinator access request.
 *
 * No admin note is collected at rejection time (the admin queue uses a plain
 * confirm), so the body explains the likely cause and the remedy instead of
 * rendering an empty reason block.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface CoordinatorRequestRejectedEmailProps {
  fullName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function CoordinatorRequestRejectedEmail({
  fullName,
  siteOrigin = 'https://biphub.eu',
}: CoordinatorRequestRejectedEmailProps) {
  const guidesUrl = `${siteOrigin}/guides/for-coordinators`
  const contactUrl = `${siteOrigin}/contact`

  return (
    <EmailShell
      preview="Your BipHub coordinator request was not approved"
      eyebrow="COORDINATOR ACCESS"
      title="Your coordinator request was not approved"
      cta={{ href: guidesUrl, label: 'How coordinator access works →' }}
      afterCta={
        <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
          Need help?{' '}
          <a href={contactUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
            Contact the BipHub team
          </a>
          .
        </Text>
      }
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
        Thanks for your interest in publishing on BipHub. After review, we
        were not able to approve your coordinator request — usually because
        we could not verify the university affiliation from the details
        provided.
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        You are welcome to file a new request with your official university
        details, or contact us and we will help sort it out.
      </Text>
    </EmailShell>
  )
}
