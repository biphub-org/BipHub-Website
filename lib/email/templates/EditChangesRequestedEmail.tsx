/**
 * EditChangesRequestedEmail — coordinator notification when an admin asks for
 * changes on a BIP edit (Phase 8 EDIT-07).
 *
 * Admin note is rendered verbatim inside a gold left-border callout.
 * `whiteSpace: 'pre-wrap'` preserves admin formatting without HTML injection —
 * JSX escapes by default (T-08-08 mitigation; no dangerouslySetInnerHTML).
 *
 * The CTA points to the edit form so the coordinator can revise and resubmit.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 *
 * Source: 08-CONTEXT.md D-11; 08-UI-SPEC.md email copy.
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell, EmailNote } from './EmailShell'

export interface EditChangesRequestedEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  /** Admin note rendered verbatim — JSX escaping prevents XSS (T-08-08) */
  adminNote: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}

export function EditChangesRequestedEmail({
  bipTitle,
  bipSlug,
  coordinatorName,
  adminNote,
  siteOrigin = 'https://biphub.eu',
}: EditChangesRequestedEmailProps) {
  const editUrl = `${siteOrigin}/dashboard/bips/${bipSlug}/edit`

  return (
    <EmailShell
      preview="Changes requested on your BIP edit"
      eyebrow="BIP UPDATE"
      title="Changes requested on your BIP edit"
      cta={{ href: editUrl, label: 'Review and resubmit →' }}
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
        Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> requires changes before it can go live.
      </Text>

      {/* Admin note callout — gold left border per UI-SPEC; renders verbatim */}
      <EmailNote title="Changes requested">
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
