/**
 * Missing-notification email tests — every user activity that previously
 * triggered no email now has a template + send-wrapper subject:
 *
 *   - coordinator request rejected → requester (CoordinatorRequestRejectedEmail)
 *   - edit submitted / resubmitted → admin inbox (EditSubmittedAdminEmail)
 *   - admin edits BIP directly → coordinator (BipUpdatedByAdminEmail)
 *   - coordinator withdraws pending BIP → admin FYI (BipWithdrawnAdminEmail)
 *   - account deleted (self or admin) → deleted address (AccountDeletedEmail)
 *   - student saves profile changes → student receipt (StudentProfileUpdatedEmail)
 *   - alert preferences created → student opt-in receipt (AlertSubscribedEmail)
 *   - contact form delivered → submitter receipt (ContactReceivedEmail)
 *
 * Plus the AlertDigest rebrand (EU blue UI, was plain unbranded markup).
 *
 * Render contract (mirrors tests/email/templates.test.tsx): key content +
 * mandatory EC disclaimer footer on every template.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@react-email/components'
import { CoordinatorRequestRejectedEmail } from '@/lib/email/templates/CoordinatorRequestRejectedEmail'
import { EditSubmittedAdminEmail } from '@/lib/email/templates/EditSubmittedAdminEmail'
import { BipUpdatedByAdminEmail } from '@/lib/email/templates/BipUpdatedByAdminEmail'
import { BipWithdrawnAdminEmail } from '@/lib/email/templates/BipWithdrawnAdminEmail'
import { AccountDeletedEmail } from '@/lib/email/templates/AccountDeletedEmail'
import { StudentProfileUpdatedEmail } from '@/lib/email/templates/StudentProfileUpdatedEmail'
import { AlertSubscribedEmail } from '@/lib/email/templates/AlertSubscribedEmail'
import { ContactReceivedEmail } from '@/lib/email/templates/ContactReceivedEmail'
import { AlertDigest } from '@/lib/email/templates/AlertDigest'
import type { EmailPayload } from '@/lib/email/send'

type SendResult =
  | { data: { id: string }; error: null }
  | { data: null; error: { message: string; statusCode: number; name: string } }
const mockSend = vi.fn(async (): Promise<SendResult> => ({ data: { id: 'mock' }, error: null }))
vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } }
  },
}))

const DISCLAIMER = ['Independent project', 'not affiliated with the European Commission'] as const

function expectDisclaimer(html: string) {
  for (const part of DISCLAIMER) expect(html).toContain(part)
}

describe('CoordinatorRequestRejectedEmail', () => {
  it('greets the requester and explains the outcome + remedy', async () => {
    const html = await render(<CoordinatorRequestRejectedEmail fullName="Dr. Jane Smith" />)
    expect(html).toContain('Dr. Jane Smith')
    expect(html).toContain('not able to approve')
    expect(html).toContain('https://biphub.eu/guides/for-coordinators')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<CoordinatorRequestRejectedEmail fullName="Jane" />)
    expectDisclaimer(html)
  })
})

describe('EditSubmittedAdminEmail', () => {
  const base = {
    bipTitle: 'Sustainable Cities',
    bipSlug: 'sustainable-cities',
    coordinatorName: 'Alice',
    coordinatorUniversity: 'TU Delft',
    submittedAt: '2026-09-18T10:00:00Z',
  }

  it('renders the fresh-edit headline for kind=edit', async () => {
    const html = await render(<EditSubmittedAdminEmail kind="edit" {...base} />)
    expect(html).toContain('New edit pending review')
    expect(html).toContain('Sustainable Cities')
    expect(html).toContain('Alice')
    expect(html).toContain('TU Delft')
    expect(html).toContain('https://biphub.eu/admin')
  })

  it('renders the resubmission headline for kind=resubmission', async () => {
    const html = await render(<EditSubmittedAdminEmail kind="resubmission" {...base} />)
    expect(html).toContain('BIP resubmitted for review')
    expect(html).toContain('back in the review queue')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<EditSubmittedAdminEmail kind="edit" {...base} />)
    expectDisclaimer(html)
  })
})

describe('BipUpdatedByAdminEmail', () => {
  it('tells the coordinator an admin changed their listing', async () => {
    const html = await render(
      <BipUpdatedByAdminEmail
        bipTitle="Quantum BIP"
        bipSlug="quantum-bip"
        bipStatus="approved"
        coordinatorName="Alice"
      />,
    )
    expect(html).toContain('Alice')
    expect(html).toContain('Quantum BIP')
    expect(html).toContain('https://biphub.eu/bip/quantum-bip')
  })

  it('links the dashboard instead of the public page for non-live BIPs', async () => {
    const html = await render(
      <BipUpdatedByAdminEmail
        bipTitle="Quantum BIP"
        bipSlug="quantum-bip"
        bipStatus="pending"
        coordinatorName="Alice"
      />,
    )
    expect(html).toContain('https://biphub.eu/dashboard')
    expect(html).not.toContain('https://biphub.eu/bip/quantum-bip')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(
      <BipUpdatedByAdminEmail
        bipTitle="X"
        bipSlug="x"
        bipStatus="approved"
        coordinatorName="A"
      />,
    )
    expectDisclaimer(html)
  })
})

describe('BipWithdrawnAdminEmail', () => {
  it('states no action is needed and names the BIP + coordinator', async () => {
    const html = await render(
      <BipWithdrawnAdminEmail
        bipTitle="Withdrawn BIP"
        bipId="bip-123"
        coordinatorName="Alice"
        coordinatorUniversity="TU Delft"
        withdrawnAt="2026-09-18T10:00:00Z"
      />,
    )
    expect(html).toContain('Withdrawn BIP')
    expect(html).toContain('no action is needed')
    expect(html).toContain('Alice')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(
      <BipWithdrawnAdminEmail
        bipTitle="X"
        bipId="y"
        coordinatorName=""
        coordinatorUniversity=""
        withdrawnAt="2026-09-18T10:00:00Z"
      />,
    )
    expectDisclaimer(html)
  })
})

describe('AccountDeletedEmail', () => {
  it('confirms a self-requested deletion', async () => {
    const html = await render(<AccountDeletedEmail initiatedBy="self" fullName="Alice" />)
    expect(html).toContain('Alice')
    expect(html).toContain('As requested')
  })

  it('explains an admin-initiated removal with recourse', async () => {
    const html = await render(<AccountDeletedEmail initiatedBy="admin" fullName="Bob" />)
    expect(html).toContain('administrator has removed your account')
    expect(html).toContain('https://biphub.eu/contact')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<AccountDeletedEmail initiatedBy="self" fullName="A" />)
    expectDisclaimer(html)
  })
})

describe('StudentProfileUpdatedEmail', () => {
  it('confirms the save with a dashboard CTA', async () => {
    const html = await render(<StudentProfileUpdatedEmail fullName="Sam Student" />)
    expect(html).toContain('Sam Student')
    expect(html).toContain('have been saved')
    expect(html).toContain('https://biphub.eu/student-dashboard')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<StudentProfileUpdatedEmail fullName="S" />)
    expectDisclaimer(html)
  })
})

describe('AlertSubscribedEmail', () => {
  it('summarises criteria + frequency with a manage CTA', async () => {
    const html = await render(
      <AlertSubscribedEmail
        fullName="Sam Student"
        fields={['Engineering']}
        countries={['NL']}
        frequency="weekly"
      />,
    )
    expect(html).toContain('Sam Student')
    expect(html).toContain('Engineering')
    expect(html).toContain('weekly')
    expect(html).toContain('https://biphub.eu/student-dashboard')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(
      <AlertSubscribedEmail fullName="S" fields={[]} countries={[]} frequency="daily" />,
    )
    expectDisclaimer(html)
  })
})

describe('ContactReceivedEmail', () => {
  it('confirms receipt with the topic label', async () => {
    const html = await render(<ContactReceivedEmail name="Jo" topicLabel="Partnerships" />)
    expect(html).toContain('Jo')
    expect(html).toContain('Partnerships')
    expect(html).toContain('reached the BipHub team')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<ContactReceivedEmail name="J" topicLabel="Other" />)
    expectDisclaimer(html)
  })
})

describe('AlertDigest (rebranded)', () => {
  const props = {
    field: 'Engineering',
    country: 'NL',
    frequency: 'weekly',
    bips: [
      { slug: 'bip-one', title: 'BIP One', hostName: 'TU Delft', hostCity: 'Delft', ects: 5 },
      { slug: 'bip-two', title: 'BIP Two', hostName: 'KTH', hostCity: null, ects: null },
    ],
    unsubscribeUrl: 'https://biphub.eu/alerts/unsubscribe?token=abc',
    siteUrl: 'https://biphub.eu',
  }

  it('renders the branded header + per-BIP links', async () => {
    const html = await render(<AlertDigest {...props} />)
    expect(html).toContain('BipHub')
    expect(html).toContain('New BIPs matching your alert')
    expect(html).toContain('BIP One')
    expect(html).toContain('https://biphub.eu/bip/bip-one')
    expect(html).toContain('TU Delft')
  })

  it('keeps the unsubscribe link and EC disclaimer', async () => {
    const html = await render(<AlertDigest {...props} />)
    expect(html).toContain('https://biphub.eu/alerts/unsubscribe?token=abc')
    expectDisclaimer(html)
  })
})

describe('sendEmail subjects for the new templates', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSend.mockClear()
    mockSend.mockImplementation(async () => ({ data: { id: 'mock' }, error: null }))
    vi.unstubAllEnvs()
    vi.stubEnv('EMAIL_SENDING_ENABLED', 'true')
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
  })

  it('rejection notice subject', async () => {
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('jane@university.edu', {
      template: 'coordinator-request-rejected',
      props: { fullName: 'Dr. Jane Smith' },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Your BipHub coordinator request was not approved' }),
    )
  })

  it('edit-submitted subjects differ by kind', async () => {
    const { sendEmail } = await import('@/lib/email/send')
    const base = {
      bipTitle: 'Sustainable Cities',
      bipSlug: 'sustainable-cities',
      coordinatorName: 'Alice',
      coordinatorUniversity: 'TU Delft',
      submittedAt: '2026-09-18T10:00:00Z',
    }
    await sendEmail('admin@x.io', { template: 'edit-submitted-admin', props: { kind: 'edit', ...base } })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'New edit pending review: Sustainable Cities' }),
    )
    mockSend.mockClear()
    await sendEmail('admin@x.io', {
      template: 'edit-submitted-admin',
      props: { kind: 'resubmission', ...base },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'BIP resubmitted for review: Sustainable Cities' }),
    )
  })

  it('remaining new-template subjects', async () => {
    const { sendEmail } = await import('@/lib/email/send')
    const cases: Array<{ payload: EmailPayload; subject: string }> = [
      {
        payload: {
          template: 'bip-updated-by-admin',
          props: { bipTitle: 'T', bipSlug: 's', bipStatus: 'approved', coordinatorName: 'A' },
        },
        subject: 'A BipHub admin updated your BIP: T',
      },
      {
        payload: {
          template: 'bip-withdrawn-admin',
          props: { bipTitle: 'T', bipId: 'id', coordinatorName: 'A', coordinatorUniversity: 'U', withdrawnAt: '2026-09-18T10:00:00Z' },
        },
        subject: 'BIP withdrawn from review: T',
      },
      {
        payload: { template: 'account-deleted', props: { initiatedBy: 'self', fullName: 'A' } },
        subject: 'Your BipHub account has been deleted',
      },
      {
        payload: { template: 'student-profile-updated', props: { fullName: 'A' } },
        subject: 'Your BipHub profile was updated',
      },
      {
        payload: {
          template: 'alert-subscribed',
          props: { fullName: 'A', fields: ['Engineering'], countries: [], frequency: 'weekly' },
        },
        subject: 'You subscribed to BIP alerts',
      },
      {
        payload: { template: 'contact-received', props: { name: 'A', topicLabel: 'Other' } },
        subject: 'We received your message',
      },
    ]
    for (const { payload, subject } of cases) {
      mockSend.mockClear()
      await sendEmail('to@x.io', payload)
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ subject }))
    }
  })
})
