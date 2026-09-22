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
import {
  CoordinatorRequestReceivedEmail,
  type CoordinatorRequestReceivedEmailProps,
} from './templates/CoordinatorRequestReceivedEmail'
import {
  CoordinatorRequestAdminEmail,
  type CoordinatorRequestAdminEmailProps,
} from './templates/CoordinatorRequestAdminEmail'
import {
  ProfileChangeApprovedEmail,
  type ProfileChangeApprovedEmailProps,
} from './templates/ProfileChangeApprovedEmail'
import {
  ProfileChangeDeclinedEmail,
  type ProfileChangeDeclinedEmailProps,
} from './templates/ProfileChangeDeclinedEmail'
import {
  ProfileChangeRequestAdminEmail,
  type ProfileChangeRequestAdminEmailProps,
} from './templates/ProfileChangeRequestAdminEmail'
import {
  StudentProfileChangedAdminEmail,
  type StudentProfileChangedAdminEmailProps,
} from './templates/StudentProfileChangedAdminEmail'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
  | { template: 'edit-approved'; props: EditApprovalEmailProps }
  | { template: 'edit-rejected'; props: EditRejectionEmailProps }
  | { template: 'edit-changes-requested'; props: EditChangesRequestedEmailProps }
  | { template: 'coordinator-request-received'; props: CoordinatorRequestReceivedEmailProps }
  | { template: 'coordinator-request-admin'; props: CoordinatorRequestAdminEmailProps }
  | { template: 'profile-change-approved'; props: ProfileChangeApprovedEmailProps }
  | { template: 'profile-change-declined'; props: ProfileChangeDeclinedEmailProps }
  | { template: 'profile-change-request-admin'; props: ProfileChangeRequestAdminEmailProps }
  | { template: 'student-profile-changed-admin'; props: StudentProfileChangedAdminEmailProps }

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
    case 'coordinator-request-received':
      return 'We received your BipHub coordinator request'
    case 'coordinator-request-admin':
      return `New coordinator request: ${payload.props.fullName || payload.props.accountEmail} (${payload.props.universityName || 'Unknown university'})`
    case 'profile-change-approved':
      return 'Your BipHub profile change was approved'
    case 'profile-change-declined':
      return 'Your BipHub profile change was declined'
    case 'profile-change-request-admin':
      return `New profile data-change request: ${payload.props.coordinatorName || payload.props.coordinatorEmail} (${payload.props.universityName || 'Unknown university'})`
    case 'student-profile-changed-admin':
      return `Student profile updated: ${payload.props.studentName || payload.props.studentEmail}`
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
  // TEMPORARY PAUSE until the biphub.org business email is set up (verified
  // Resend sender + Supabase SMTP). Re-enable by setting
  // EMAIL_SENDING_ENABLED=true, then delete this block.
  if (process.env.EMAIL_SENDING_ENABLED !== 'true') {
    console.log('[EMAIL PAUSED]', { to, template: payload.template })
    return
  }

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
    case 'coordinator-request-received':
      element = React.createElement(CoordinatorRequestReceivedEmail, payload.props)
      break
    case 'coordinator-request-admin':
      element = React.createElement(CoordinatorRequestAdminEmail, payload.props)
      break
    case 'profile-change-approved':
      element = React.createElement(ProfileChangeApprovedEmail, payload.props)
      break
    case 'profile-change-declined':
      element = React.createElement(ProfileChangeDeclinedEmail, payload.props)
      break
    case 'profile-change-request-admin':
      element = React.createElement(ProfileChangeRequestAdminEmail, payload.props)
      break
    case 'student-profile-changed-admin':
      element = React.createElement(StudentProfileChangedAdminEmail, payload.props)
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

  // No replyTo header on purpose: replies fall back to the From address
  // (no-reply@biphub.org), which has no mailbox and hard-bounces. Never
  // add a replyTo here — it would route replies to a live inbox.

  // NOTE: the Resend SDK resolves (does NOT throw) on API errors — failures
  // arrive as `{ data: null, error }`. Ignoring the return value makes every
  // Resend-side rejection (bad key, unverified domain, quota) completely
  // silent, so surface it as a throw. Callers MUST catch (D-11) and log.
  const result = await resend.emails.send({
    from: 'BipHub <no-reply@biphub.org>', // D-13 verified sender
    to,
    subject,
    html,
  })
  if (result.error) {
    throw new Error(
      `Resend send failed [${result.error.name}]: ${result.error.message}`,
    )
  }
}
