/**
 * EditApprovalEmail — coordinator notification when a BIP edit is approved (Phase 8 EDIT-07).
 *
 * Sent after admin approves a bip_edits row and the updated content goes live.
 * No admin note block — approval is clean/final.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 08-CONTEXT.md D-11; 08-UI-SPEC.md email copy; 08-PATTERNS.md EditApprovalEmail section.
 * Threat: T-08-08 mitigated by JSX text escaping (no dangerouslySetInnerHTML).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface EditApprovalEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditApprovalEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  siteOrigin = 'https://biphub.eu',
}: EditApprovalEmailProps) {
  const publicUrl = `${siteOrigin}/bip/${bipSlug}`

  return (
    <EmailShell
      preview="Your BIP edit is live on BipHub"
      eyebrow="BIP UPDATE"
      title="Your BIP edit is live on BipHub"
      cta={{ href: publicUrl, label: 'View your BIP' }}
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
        Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> has been approved and the updated version is now live.
      </Text>
    </EmailShell>
  )
}
