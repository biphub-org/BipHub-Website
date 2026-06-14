/**
 * Email template render tests — Phase 3 ADMN-09 (approval) conditional note
 * block per D-14.
 *
 * Threat: T-03-06 — PII exposure in emails / missing EC disclaimer.
 * Mitigation: every template renders the EC disclaimer footer verbatim;
 * note block only renders when prop is set.
 *
 * Source: 03-CONTEXT.md D-14 (locked email content); 03-UI-SPEC.md Email
 * Template Visual Contract.
 *
 * Stubs filled in by Plan 03-03 (ApprovalEmail) and Plan 03-04 (RejectionEmail).
 */
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { ApprovalEmail, type ApprovalEmailProps } from '@/lib/email/templates/ApprovalEmail'
import { RejectionEmail, type RejectionEmailProps } from '@/lib/email/templates/RejectionEmail'
import {
  AdminNotificationEmail,
  type AdminNotificationEmailProps,
} from '@/lib/email/templates/AdminNotificationEmail'

async function renderApproval(props: ApprovalEmailProps): Promise<string> {
  return render(<ApprovalEmail {...props} />)
}

async function renderRejection(props: RejectionEmailProps): Promise<string> {
  return render(<RejectionEmail {...props} />)
}

async function renderAdminNotif(props: AdminNotificationEmailProps): Promise<string> {
  return render(<AdminNotificationEmail {...props} />)
}

describe('ApprovalEmail', () => {
  it('renders BIP title verbatim in heading', async () => {
    const html = await renderApproval({
      bipTitle: 'Sustainable Cities BIP',
      bipSlug: 'sustainable-cities',
      coordinatorName: 'Alice',
    })
    expect(html).toContain('Sustainable Cities BIP')
  })

  it('renders public /bip/[slug] CTA href', async () => {
    const html = await renderApproval({
      bipTitle: 'X',
      bipSlug: 'unique-slug-abc',
      coordinatorName: 'A',
    })
    expect(html).toContain('https://biphub.eu/bip/unique-slug-abc')
  })

  it('renders "Note from the BipHub team" block when note prop is set', async () => {
    const html = await renderApproval({
      bipTitle: 'X',
      bipSlug: 'x',
      coordinatorName: 'A',
      note: 'Great work on the partner list!',
    })
    expect(html).toContain('Note from the BipHub team')
    expect(html).toContain('Great work on the partner list!')
  })

  it('omits note block when note prop is undefined', async () => {
    const html = await renderApproval({
      bipTitle: 'X',
      bipSlug: 'x',
      coordinatorName: 'A',
    })
    expect(html).not.toContain('Note from the BipHub team')
  })

  it('renders EC disclaimer footer "Independent project — not affiliated…"', async () => {
    const html = await renderApproval({
      bipTitle: 'X',
      bipSlug: 'x',
      coordinatorName: 'A',
    })
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })
})

// RejectionEmail — filled in Plan 03-04 (ADMN-10 / D-14)
describe('RejectionEmail', () => {
  it('renders reason verbatim in callout block', async () => {
    const html = await renderRejection({
      bipTitle: 'Quantum BIP',
      bipId: 'abc-123',
      coordinatorName: 'Alice',
      reason:
        'The learning outcomes section needs more detail about assessment criteria.',
    })
    expect(html).toContain(
      'The learning outcomes section needs more detail about assessment criteria.',
    )
  })

  it('CTA targets the dashboard Rejected view (revise & resubmit), not a dead /edit deep link', async () => {
    const html = await renderRejection({
      bipTitle: 'X',
      bipId: 'unique-id-xyz',
      coordinatorName: 'A',
      reason: 'x'.repeat(20),
    })
    // A rejected BIP cannot open at /dashboard/bips/[id]/edit (404 — that route
    // only accepts draft/pending), so the CTA must route to the dashboard where
    // the "Revise & resubmit" affordance lives. Guard against regressing to the
    // dead deep link.
    expect(html).toContain('https://biphub.eu/dashboard?status=rejected')
    expect(html).not.toContain('/dashboard/bips/unique-id-xyz/edit')
  })

  it('renders gold left-border on reason callout (per UI-SPEC)', async () => {
    const html = await renderRejection({
      bipTitle: 'X',
      bipId: 'x',
      coordinatorName: 'A',
      reason: 'x'.repeat(20),
    })
    // gold = #FFCC00 from EMAIL_TOKENS.euGold
    expect(html.toLowerCase()).toContain('#ffcc00')
    expect(html).toContain('4px solid')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await renderRejection({
      bipTitle: 'X',
      bipId: 'x',
      coordinatorName: 'A',
      reason: 'x'.repeat(20),
    })
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })
})

// AdminNotificationEmail — Plan 03-05 (ADMN-11 / D-14)
describe('AdminNotificationEmail', () => {
  it('renders coordinator name + university in body', async () => {
    const html = await renderAdminNotif({
      bipTitle: 'Climate BIP',
      bipId: 'abc',
      coordinatorName: 'Alice Bobson',
      coordinatorUniversity: 'TU Delft',
      submittedAt: '2026-05-12T10:00:00Z',
    })
    expect(html).toContain('Alice Bobson')
    expect(html).toContain('TU Delft')
  })

  it('renders /admin/bips/[id]/review CTA href', async () => {
    const html = await renderAdminNotif({
      bipTitle: 'X',
      bipId: 'unique-bip-id',
      coordinatorName: 'A',
      coordinatorUniversity: 'U',
      submittedAt: '2026-05-12T10:00:00Z',
    })
    expect(html).toContain('https://biphub.eu/admin/bips/unique-bip-id/review')
  })

  it('renders BIP title verbatim', async () => {
    const html = await renderAdminNotif({
      bipTitle: 'Quantum Computing BIP 2026',
      bipId: 'x',
      coordinatorName: 'A',
      coordinatorUniversity: 'U',
      submittedAt: '2026-05-12T10:00:00Z',
    })
    expect(html).toContain('Quantum Computing BIP 2026')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await renderAdminNotif({
      bipTitle: 'X',
      bipId: 'x',
      coordinatorName: 'A',
      coordinatorUniversity: 'U',
      submittedAt: '2026-05-12T10:00:00Z',
    })
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })
})
