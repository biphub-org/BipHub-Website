/**
 * EditSubmittedAdminEmail — sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a coordinator submits or resubmits work
 * that lands back in the review queue:
 *
 *   kind 'edit'         — submitEditAction / resubmitEditAction (bip_edits row)
 *   kind 'resubmission' — resubmitPendingBipAction (bips row back to pending)
 *
 * A fresh draft→pending submission keeps using AdminNotificationEmail; this
 * template covers everything that re-enters the queue afterwards.
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts).
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'
import { formatLongDate } from '@/lib/utils/dates'

export interface EditSubmittedAdminEmailProps {
  kind: 'edit' | 'resubmission'
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  coordinatorUniversity: string
  /** ISO 8601 timestamp; rendered as a human-readable date+time in en-GB locale. */
  submittedAt: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditSubmittedAdminEmail({
  kind,
  bipTitle,
  bipSlug,
  coordinatorName,
  coordinatorUniversity,
  submittedAt,
  siteOrigin = 'https://biphub.eu',
}: EditSubmittedAdminEmailProps) {
  const isResubmission = kind === 'resubmission'
  const headline = isResubmission ? 'BIP resubmitted for review' : 'New edit pending review'
  const reviewUrl = `${siteOrigin}/admin`
  const submittedLabel = formatLongDate(submittedAt)

  return (
    <EmailShell
      preview={`${headline}: ${bipTitle}`}
      eyebrow="REVIEW QUEUE"
      title={headline}
      cta={{ href: reviewUrl, label: 'Open the review queue →' }}
      afterCta={
        <Text style={{ fontSize: T.smallSize, color: T.muted, lineHeight: T.smallLineHeight }}>
          BIP slug: {bipSlug}
        </Text>
      }
    >
      {/* Body */}
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        <strong>&ldquo;{bipTitle}&rdquo;</strong>{' '}
        {isResubmission
          ? 'was revised and resubmitted — it is back in the review queue.'
          : 'has a new edit waiting for review.'}
      </Text>
      <Text
        style={{
          fontSize: T.smallSize,
          color: T.muted,
          lineHeight: T.smallLineHeight,
          marginTop: T.smallGap,
        }}
      >
        Coordinator: {coordinatorName || 'Unknown'}
        {coordinatorUniversity ? ` (${coordinatorUniversity})` : ''} · Submitted {submittedLabel}
      </Text>
    </EmailShell>
  )
}
