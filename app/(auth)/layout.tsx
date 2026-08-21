/**
 * Auth route group layout — minimal centered-card chrome (D-12, D-13).
 *
 * Routes in scope: /login, /register, /verify-email, /reset-password, /reset-password/update
 *
 * Deviates from the public layout: the public site nav and the public site footer
 * are intentionally absent. Auth pages render errors inline via the Alert primitive
 * (variant="destructive") instead of toasts.
 *
 * INFO-03 compliance: the disclaimer copy below MUST match the phrase used in the
 * public-site bottom row exactly (em-dash, no period). The phrase is also covered
 * in CLAUDE.md never-do list.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg-soft px-4 py-8">
      <div className="w-full max-w-[440px]">{children}</div>
      <p className="fixed bottom-4 left-0 right-0 text-center text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
    </div>
  )
}
