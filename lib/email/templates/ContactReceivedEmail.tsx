/**
 * ContactReceivedEmail — receipt sent to the submitter's address after the
 * public contact form delivers their message to the site inbox
 * (submitContactAction). Sent only when the inbox delivery succeeded, so a
 * receipt never promises handling of a message we did not receive.
 *
 * Chrome comes from EmailShell (the shared no-reply template).
 * EC disclaimer in footer is MANDATORY (CLAUDE.md never-do compliance).
 */
import { Text } from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
import { EmailShell } from './EmailShell'

export interface ContactReceivedEmailProps {
  name: string
  topicLabel: string
}

export function ContactReceivedEmail({ name, topicLabel }: ContactReceivedEmailProps) {
  return (
    <EmailShell
      preview="We received your message"
      eyebrow="CONTACT"
      title="We received your message"
    >
      {/* Body */}
      <Text style={{ fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight, margin: 0 }}>
        Hi {name || 'there'},
      </Text>
      <Text
        style={{
          fontSize: T.bodySize,
          color: T.ink,
          lineHeight: T.bodyLineHeight,
          marginTop: T.smallGap,
        }}
      >
        Thanks for writing to us about <strong>{topicLabel}</strong>. Your
        message reached the BipHub team and we will get back to you at this
        email address.
      </Text>
    </EmailShell>
  )
}
