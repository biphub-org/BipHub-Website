/**
 * RejectionEmail — coordinator notification when a BIP is rejected (ADMN-10 / D-14).
 *
 * Reason is rendered verbatim inside a gold left-border callout per
 * 03-UI-SPEC.md. `whiteSpace: 'pre-wrap'` preserves admin formatting
 * without HTML injection — JSX escapes by default (T-03-06 mitigation).
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 03-CONTEXT.md D-14; 03-UI-SPEC.md Email Template Visual Contract.
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface RejectionEmailProps {
  bipTitle: string
  /**
   * Retained on the data contract (callers pass it) though the CTA no longer
   * deep-links per-BIP — a rejected BIP can't open at /dashboard/bips/[id]/edit
   * (404), so the CTA routes to the dashboard Rejected view instead.
   */
  bipId: string
  reason: string
  coordinatorName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function RejectionEmail({
  bipTitle,
  reason,
  coordinatorName,
  siteOrigin = 'https://biphub.eu',
}: RejectionEmailProps) {
  // CTA targets the dashboard's Rejected view, where the coordinator clicks
  // "Revise & resubmit" to reopen the BIP. A rejected BIP cannot be opened at
  // /dashboard/bips/[id]/edit directly (that route only accepts draft/pending),
  // so deep-linking there would 404 — the dashboard is the working entry point.
  const dashboardUrl = `${siteOrigin}/dashboard?status=rejected`

  return (
    <EmailShell
      preview="Update needed on your BIP submission"
      eyebrow="BIP UPDATE"
      title="Update needed on your BIP submission"
      cta={{ href: dashboardUrl, label: 'Revise and resubmit →' }}
      afterCta={
        <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
          From your dashboard, choose{' '}
          <strong>Revise &amp; resubmit</strong> on this BIP to reopen it, make
          your changes, and submit it for review again.
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
        Your submission <strong>&ldquo;{bipTitle}&rdquo;</strong> needs changes before it can go live.
      </Text>

      {/* Reason callout — gold left border per UI-SPEC */}
      <EmailNote title="Reviewer feedback">
        <Text
          style={{
            fontSize: T.bodySize,
            color: T.ink,
            lineHeight: T.bodyLineHeight,
            marginTop: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reason}
        </Text>
      </EmailNote>

      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
        }}
      >
        You can revise and resubmit at any time.
      </Text>
    </EmailShell>
  )
}
