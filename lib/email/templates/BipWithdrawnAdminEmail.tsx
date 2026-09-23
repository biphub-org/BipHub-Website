/**
 * BipWithdrawnAdminEmail — FYI sent to the platform admin recipient
 * (ADMIN_NOTIFICATION_EMAIL) when a coordinator withdraws a pending BIP
 * back to draft (withdrawBipAction). No review action is needed — the BIP
 * simply left the queue, so the subject says so explicitly.
 *
 * Subject is computed at the send-wrapper layer (lib/email/send.ts).
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface BipWithdrawnAdminEmailProps {
  bipTitle: string
  bipId: string
  coordinatorName: string
  coordinatorUniversity: string
  /** ISO 8601 timestamp; rendered raw (short) — no date util needed for an FYI. */
  withdrawnAt: string
}

export function BipWithdrawnAdminEmail({
  bipTitle,
  bipId,
  coordinatorName,
  coordinatorUniversity,
  withdrawnAt,
}: BipWithdrawnAdminEmailProps) {
  return (
    <EmailShell
      preview={`BIP withdrawn from review: ${bipTitle} — no action needed`}
      eyebrow="REVIEW QUEUE"
      title="BIP withdrawn from review"
    >
      {/* Body */}
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        <strong>&ldquo;{bipTitle}&rdquo;</strong> was withdrawn by its
        coordinator and moved back to draft — it left the review queue, so
        no action is needed.
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
        {coordinatorUniversity ? ` (${coordinatorUniversity})` : ''} · BIP id: {bipId} ·
        Withdrawn {withdrawnAt}
      </Text>
    </EmailShell>
  )
}
