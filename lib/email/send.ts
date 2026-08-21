/**
 * Transactional email send wrapper (Phase 3 ADMN-09 / ADMN-10 / ADMN-11).
 *
 * Resend SDK in prod (RESEND_API_KEY set) or D-15 console fallback in dev.
 *
 * This module is server-only — it imports `Resend` (which reads
 * `RESEND_API_KEY` from process.env). It does NOT carry the
 * `'use server'` directive: the Server Actions that call it carry
 * `'use server'` themselves; this is a plain utility module.
 *
 * D-11 fire-and-forget contract: this function may throw on Resend
 * failure. Callers (Server Actions) MUST wrap in try/catch and NOT
 * re-throw — a Resend outage must not reverse a committed DB transaction.
 *
 * Subject resolution is per-call (resolveSubject) because the
 * admin-notification template needs a dynamic subject derived from
 * props.bipTitle: "New BIP pending review: {title}" (D-14).
 *
 * Source: 03-RESEARCH.md Pattern 5; 03-CONTEXT.md D-11, D-13, D-14, D-15.
 */
import * as React from 'react'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { ApprovalEmail, type ApprovalEmailProps } from './templates/ApprovalEmail'
import { RejectionEmail, type RejectionEmailProps } from './templates/RejectionEmail'
import {
  AdminNotificationEmail,
  type AdminNotificationEmailProps,
} from './templates/AdminNotificationEmail'
import { EditApprovalEmail, type EditApprovalEmailProps } from './templates/EditApprovalEmail'
import { EditRejectionEmail, type EditRejectionEmailProps } from './templates/EditRejectionEmail'
import {
  EditChangesRequestedEmail,
  type EditChangesRequestedEmailProps,
} from './templates/EditChangesRequestedEmail'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
  | { template: 'edit-approved'; props: EditApprovalEmailProps }
  | { template: 'edit-rejected'; props: EditRejectionEmailProps }
  | { template: 'edit-changes-requested'; props: EditChangesRequestedEmailProps }

/**
 * Compute the email subject. Approval + rejection use static strings;
 * admin-notification injects the BIP title per D-14.
 */
function resolveSubject(payload: EmailPayload): string {
  switch (payload.template) {
    case 'approval':
      return 'Your BIP is live on BipHub'
    case 'rejection':
      return 'Update needed on your BIP submission'
    case 'admin-notification':
      return `New BIP pending review: ${payload.props.bipTitle}`
    case 'edit-approved':
      return 'Your BIP edit is live'
    case 'edit-rejected':
      return 'Your BIP edit was not approved'
    case 'edit-changes-requested':
      return 'Changes requested on your BIP edit'
    default: {
      const _exhaustive: never = payload
      throw new Error(
        `Unknown email template: ${String((_exhaustive as { template: string }).template)}`,
      )
    }
  }
}

/**
 * Send a transactional email via Resend.
 *
 * D-15 local-dev fallback: when RESEND_API_KEY is unset, log the rendered
 * HTML + recipient + subject to console instead of calling Resend.
 */
export async function sendEmail(to: string, payload: EmailPayload): Promise<void> {
  let element: React.ReactElement
  switch (payload.template) {
    case 'approval':
      element = React.createElement(ApprovalEmail, payload.props)
      break
    case 'rejection':
      element = React.createElement(RejectionEmail, payload.props)
      break
    case 'admin-notification':
      element = React.createElement(AdminNotificationEmail, payload.props)
      break
    case 'edit-approved':
      element = React.createElement(EditApprovalEmail, payload.props)
      break
    case 'edit-rejected':
      element = React.createElement(EditRejectionEmail, payload.props)
      break
    case 'edit-changes-requested':
      element = React.createElement(EditChangesRequestedEmail, payload.props)
      break
    default: {
      const _exhaustive: never = payload
      throw new Error(
        `Unknown email template: ${String((_exhaustive as { template: string }).template)}`,
      )
    }
  }
  const subject = resolveSubject(payload)
  const html = await render(element)

  if (!resend) {
    // D-15: dev fallback — never call Resend without API key
    console.log('[EMAIL DEV]', {
      to,
      subject,
      html: html.slice(0, 400) + (html.length > 400 ? '…' : ''),
    })
    return
  }

  const replyTo = process.env.ADMIN_REPLY_TO_EMAIL || 'noreply@biphub.eu'

  await resend.emails.send({
    from: 'BipHub <noreply@biphub.eu>', // D-13 verified sender
    to,
    replyTo,
    subject,
    html,
  })
}
