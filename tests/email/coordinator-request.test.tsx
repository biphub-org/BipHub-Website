/**
 * Coordinator-request email tests — the submit action previously inserted the
 * `coordinator_requests` row and returned without sending anything: no
 * confirmation reached the requester's contact email and no notification
 * reached the admin inbox.
 *
 * Covers the two new templates (render contract: requester details, review
 * CTA, mandatory EC disclaimer) and their send-wrapper subjects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@react-email/components'
import { CoordinatorRequestReceivedEmail } from '@/lib/email/templates/CoordinatorRequestReceivedEmail'
import { CoordinatorRequestAdminEmail } from '@/lib/email/templates/CoordinatorRequestAdminEmail'

// Template render tests use the real @react-email render (same as
// tests/email/templates.test.tsx); only the Resend SDK is mocked so the
// subject tests never touch the network.
type SendResult =
  | { data: { id: string }; error: null }
  | { data: null; error: { message: string; statusCode: number; name: string } }
const mockSend = vi.fn(async (): Promise<SendResult> => ({ data: { id: 'mock' }, error: null }))
vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } }
  },
}))

describe('CoordinatorRequestReceivedEmail', () => {
  it('greets the requester by name and explains the under-review state', async () => {
    const html = await render(
      <CoordinatorRequestReceivedEmail fullName="Dr. Jane Smith" />,
    )
    expect(html).toContain('Dr. Jane Smith')
    expect(html).toContain('under review')
  })

  it('links to the login page for status checks', async () => {
    const html = await render(
      <CoordinatorRequestReceivedEmail fullName="Jane" />,
    )
    expect(html).toContain('https://biphub.eu/login')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(
      <CoordinatorRequestReceivedEmail fullName="Jane" />,
    )
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })
})

describe('CoordinatorRequestAdminEmail', () => {
  const props = {
    fullName: 'Dr. Jane Smith',
    accountEmail: 'jane@university.edu',
    universityName: 'TU Delft',
    erasmusCode: 'NL DELFT01',
    submittedAt: '2026-09-18T10:00:00Z',
  }

  it('renders requester name, email, and university in body', async () => {
    const html = await render(<CoordinatorRequestAdminEmail {...props} />)
    expect(html).toContain('Dr. Jane Smith')
    expect(html).toContain('jane@university.edu')
    expect(html).toContain('TU Delft')
    expect(html).toContain('NL DELFT01')
  })

  it('CTA targets the coordinator-requests review inbox', async () => {
    const html = await render(<CoordinatorRequestAdminEmail {...props} />)
    expect(html).toContain('https://biphub.eu/admin/coordinators/requests')
  })

  it('renders EC disclaimer footer', async () => {
    const html = await render(<CoordinatorRequestAdminEmail {...props} />)
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })
})

describe('sendEmail subjects for coordinator-request templates', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSend.mockClear()
    mockSend.mockImplementation(async () => ({ data: { id: 'mock' }, error: null }))
    vi.unstubAllEnvs()
    vi.stubEnv('EMAIL_SENDING_ENABLED', 'true')
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
  })

  it('uses a static received subject for the requester confirmation', async () => {
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('jane.contact@university.edu', {
      template: 'coordinator-request-received',
      props: { fullName: 'Dr. Jane Smith' },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane.contact@university.edu',
        subject: 'We received your BipHub coordinator request',
      }),
    )
  })

  it('uses a dynamic subject with name + university for the admin notification', async () => {
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('admin@x.io', {
      template: 'coordinator-request-admin',
      props: {
        fullName: 'Dr. Jane Smith',
        accountEmail: 'jane@university.edu',
        universityName: 'TU Delft',
        erasmusCode: 'NL DELFT01',
        submittedAt: '2026-09-18T10:00:00Z',
      },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'New coordinator request: Dr. Jane Smith (TU Delft)',
      }),
    )
  })
})
