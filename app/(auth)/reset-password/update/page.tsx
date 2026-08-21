import { LogoMark } from '@/components/home/LogoMark'
import { PasswordResetUpdateForm } from '@/components/auth/PasswordResetUpdateForm'

/**
 * Destination of the type=recovery callback redirect. The session cookie is
 * already set when the user lands here; updatePasswordAction re-validates with
 * getClaims() before calling supabase.auth.updateUser().
 */
export default function ResetPasswordUpdatePage() {
  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Set a new password
        </h1>
        <p className="text-center text-sm text-muted">
          Choose a new password to complete your reset.
        </p>
      </header>
      <PasswordResetUpdateForm />
    </section>
  )
}
