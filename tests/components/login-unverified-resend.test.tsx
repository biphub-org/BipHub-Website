import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from '@/components/auth/LoginForm'
import {
  signInAction,
  resolveLoginMethodAction,
  resendVerificationAction,
} from '@/lib/actions/auth'

vi.mock('@/lib/actions/auth', () => ({
  signInAction: vi.fn(),
  signInWithOtpAction: vi.fn(),
  resolveLoginMethodAction: vi.fn(),
  resendVerificationAction: vi.fn(),
}))

const EMAIL = 'new.student@example.com'
const UNVERIFIED_ERROR = 'Please verify your email before signing in.'

async function reachPasswordStep() {
  render(<LoginForm />)
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: EMAIL } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByLabelText(/password/i)
}

async function submitPassword() {
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' },
  })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

beforeEach(() => {
  vi.mocked(resolveLoginMethodAction).mockReset()
  vi.mocked(signInAction).mockReset()
  vi.mocked(resendVerificationAction).mockReset()
  vi.mocked(resolveLoginMethodAction).mockResolvedValue({ method: 'password' })
})

describe('LoginForm unverified-email resend', () => {
  it('shows a resend button when sign-in fails as unverified', async () => {
    vi.mocked(signInAction).mockResolvedValue({
      error: `${UNVERIFIED_ERROR} Check your inbox or resend the verification email.`,
      code: 'email_unverified',
    })
    await reachPasswordStep()
    await submitPassword()

    await screen.findByText(/please verify your email/i)
    expect(
      screen.getByRole('button', { name: /resend verification/i }),
    ).toBeDefined()
  })

  it('does not show a resend button for other sign-in errors', async () => {
    vi.mocked(signInAction).mockResolvedValue({
      error: 'Email or password is incorrect.',
    })
    await reachPasswordStep()
    await submitPassword()

    await screen.findByText(/email or password is incorrect/i)
    expect(screen.queryByRole('button', { name: /resend verification/i })).toBeNull()
  })

  it('resends the verification to the entered email', async () => {
    vi.mocked(signInAction).mockResolvedValue({
      error: UNVERIFIED_ERROR,
      code: 'email_unverified',
    })
    vi.mocked(resendVerificationAction).mockResolvedValue({ success: true })
    await reachPasswordStep()
    await submitPassword()

    fireEvent.click(await screen.findByRole('button', { name: /resend verification/i }))

    await screen.findByText(/sent\. check your inbox/i)
    const fd = vi.mocked(resendVerificationAction).mock.calls[0][0] as FormData
    expect(fd.get('email')).toBe(EMAIL)
  })
})
