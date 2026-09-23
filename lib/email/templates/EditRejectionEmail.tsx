/**
 * EditRejectionEmail — coordinator notification when a BIP edit is rejected (Phase 8 EDIT-07).
 *
 * Admin note is rendered verbatim inside a gold left-border callout.
 * `whiteSpace: 'pre-wrap'` preserves admin formatting without HTML injection —
 * JSX escapes by default (T-08-08 mitigation; no dangerouslySetInnerHTML).
 *
 * The live BIP stays unchanged after edit rejection; the CTA points to the
 * edit form so the coordinator can review the note and revise.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 08-CONTEXT.md D-11; 08-UI-SPEC.md email copy; 08-PATTERNS.md EditRejectionEmail section.
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface EditRejectionEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  /** Admin note rendered verbatim — JSX escaping prevents XSS (T-08-08) */
  adminNote: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditRejectionEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  adminNote,
  siteOrigin = 'https://biphub.eu',
}: EditRejectionEmailProps) {
  const editUrl = `${siteOrigin}/dashboard/bips/${bipSlug}/edit`

  return (
    <EmailShell
      preview="Your BIP edit was not approved"
      eyebrow="BIP UPDATE"
      title="Your BIP edit was not approved"
      cta={{ href: editUrl, label: 'View your BIP dashboard' }}
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
        Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> has been reviewed and was not approved.
        The live BIP remains unchanged.
      </Text>

      {/* Admin note callout — gold left border per UI-SPEC; renders verbatim */}
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
          {adminNote}
        </Text>
      </EmailNote>
    </EmailShell>
  )
}
