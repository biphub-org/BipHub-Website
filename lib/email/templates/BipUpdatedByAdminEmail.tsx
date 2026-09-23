/**
 * BipUpdatedByAdminEmail — coordinator notification when an admin edits one
 * of their BIPs directly (adminUpdateBipAction). Admin edits preserve status
 * (D-18), so the coordinator's live listing may have changed under them —
 * this email tells them what happened and where to look.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface BipUpdatedByAdminEmailProps {
  bipTitle: string
  bipSlug: string
  bipStatus: string
  coordinatorName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function BipUpdatedByAdminEmail({
  bipTitle,
  bipSlug,
  bipStatus,
  coordinatorName,
  siteOrigin = 'https://biphub.eu',
}: BipUpdatedByAdminEmailProps) {
  const dashboardUrl = `${siteOrigin}/dashboard`
  const publicUrl = `${siteOrigin}/bip/${bipSlug}`
  const isLive = bipStatus === 'approved'

  return (
    <EmailShell
      preview="A BipHub admin updated your BIP"
      eyebrow="BIP UPDATE"
      title="A BipHub admin updated your BIP"
      cta={{
        href: isLive ? publicUrl : dashboardUrl,
        label: isLive ? 'View your BIP →' : 'Open your dashboard →',
      }}
      afterCta={
        isLive ? (
          <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
            Or open your{' '}
            <a href={dashboardUrl} style={{ color: T.euBlue, textDecoration: 'underline' }}>
              BipHub dashboard
            </a>{' '}
            to manage your listings.
          </Text>
        ) : undefined
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
        A member of the BipHub team made a correction to your BIP{' '}
        <strong>&ldquo;{bipTitle}&rdquo;</strong>
        {isLive ? ', which is currently live' : ''}. No action is needed —
        but you may want to check that everything still looks right.
      </Text>
    </EmailShell>
  )
}
