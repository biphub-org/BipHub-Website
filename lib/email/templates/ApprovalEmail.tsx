/**
 * ApprovalEmail — coordinator notification when a BIP is approved (ADMN-09 / D-14).
 *
 * Conditional `note` block: only renders when `note` prop is set; UI-SPEC
 * gold left-border + bg-soft callout.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 03-CONTEXT.md D-14; 03-UI-SPEC.md Email Template Visual Contract.
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface ApprovalEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  note?: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function ApprovalEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  note,
  siteOrigin = 'https://biphub.eu',
}: ApprovalEmailProps) {
  const publicUrl = `${siteOrigin}/bip/${bipSlug}`
  const dashboardUrl = `${siteOrigin}/dashboard`

  return (
    <EmailShell
      preview="Your BIP is live on BipHub"
      eyebrow="BIP UPDATE"
      title="Your BIP is live on BipHub"
      cta={{ href: publicUrl, label: 'View your BIP →' }}
      afterCta={
        <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
          Or open your{' '}
          <a href={dashboardUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
            BipHub dashboard
          </a>{' '}
          to manage your listings.
        </Text>
      }
    >
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
        Your BIP <strong>&ldquo;{bipTitle}&rdquo;</strong> has been approved and is now visible to students.
      </Text>

      {note ? (
        <EmailNote title="Note from the BipHub team">
          <Text
            style={{
              fontSize: T.bodySize,
              color: T.ink,
              lineHeight: T.bodyLineHeight,
              marginTop: '4px',
            }}
          >
            {note}
          </Text>
        </EmailNote>
      ) : null}
    </EmailShell>
  )
}
