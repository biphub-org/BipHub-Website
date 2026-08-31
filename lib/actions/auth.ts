'use server'

/**
 * Auth Server Actions for Phase 2 (AUTH-01..AUTH-06).
 *
 * Contract:
 *   - `'use server'` is file-level (top of file). Every export is a Server Action.
 *   - Each action accepts FormData so RHF can `formData.set` and call them directly.
 *   - JWT validation uses `getClaims()` ONLY — never the unvalidated session getter
 *     (CLAUDE.md never-do; PITFALLS Pitfall 1).
 *   - `await createClient()` on every call (factory awaits `cookies()` internally —
 *     PITFALLS Pitfall 3 / Next.js 15 async cookies).
 *   - Success-with-redirect actions throw via `next/navigation`'s `redirect()` and
 *     therefore never return; failure paths return `{ error }` for inline display.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import {
  loginSchema,
  registerSchema,
  resolveLoginSchema,
  passwordResetSchema,
  passwordUpdateSchema,
} from '@/lib/schemas/auth'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// AUTH-03: sign in with email + password. Validates server-side then signs in.
// On success, redirects to /dashboard (or /onboarding when the profile is
// incomplete, or /admin when the role is admin) — Next.js redirect throws,
// never returns. Routing decision is made here so the browser doesn't bounce
// through /dashboard's layout before being re-redirected, which previously
// caused a visible white screen between server navigations (Plan 02-02 D-05).
export async function signInAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    const msg = error.message.toLowerCase()
    // Map known Supabase error substrings to UI-SPEC error copy. Unknown errors fall through
    // to a generic message so we never leak internal account state (T-02-02-06).
    if (msg.includes('invalid login') || msg.includes('invalid_credentials')) {
      return { error: 'Email or password is incorrect.' }
    }
    if (msg.includes('email not confirmed')) {
      return {
        error:
          'Please verify your email before signing in. Check your inbox or resend the verification email.',
      }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

    // Role-aware redirect: students go straight to their dashboard,
  // coordinators/admins keep the profile-complete gate.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as { sub?: string; app_metadata?: { role?: string } } | undefined
  const role = claims?.app_metadata?.role

  if (role === 'student') {
    redirect('/student-dashboard')
  }
  if (role === 'admin') {
    redirect('/admin')
  }

  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, university_id, contact_email, erasmus_code')
      .eq('id', claims.sub)
      .maybeSingle()

    const isComplete = Boolean(
      profile?.full_name &&
        profile?.university_id &&
        profile?.contact_email &&
        profile?.erasmus_code,
    )
    redirect(isComplete ? '/dashboard' : '/onboarding')
  }

  redirect('/dashboard')
}

// AUTH-01 + AUTH-02: register + dispatch verification email via Supabase mailer.
// emailRedirectTo points at /auth/callback so the PKCE code returns to our route handler.
// Coordinator path — requires email verification via /verify-email.
export async function signUpAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  })
  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('user already')) {
      return { error: 'An account with this email already exists. Sign in instead?' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
  redirect('/verify-email?email=' + encodeURIComponent(parsed.data.email))
}

// Student registration: email + password, no email confirmation, auto-approved.
// Creates the user with role='student' so handle_new_user sets profiles.role.
// With enable_confirmations=false the user is immediately confirmed, so we
// sign in directly and redirect to /student-dashboard.
export async function signUpStudentAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { role: 'student' } },
  })
  if (signUpError) {
    const msg = signUpError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('user already')) {
      return { error: 'An account with this email already exists. Sign in instead?' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  // Establishes the SSR session cookie. With confirmations disabled this
  // succeeds immediately; if confirmations were enabled it would surface
  // 'email not confirmed' which we surface as a generic error.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (signInError) {
    const msg = signInError.message.toLowerCase()
    if (msg.includes('email not confirmed')) {
      return { error: 'Account created. Please verify your email before signing in.' }
    }
    return { error: 'Account created. Please sign in.' }
  }

  revalidatePath('/', 'layout')
  redirect('/student-dashboard')
}

// Resend the signup verification email for users who didn't receive (or lost) the
// first one. Validates the email server-side so the button on /verify-email can't
// be repurposed to spam arbitrary addresses. Mirrors signUpAction's emailRedirectTo
// so the PKCE callback lands the same way.
//
// T-02-02-05 (user-enumeration): always return { success: true } even when Supabase
// reports an error, so a bad-actor probing this endpoint can't tell whether an
// email is registered. We still log internally.
//
// Supabase rate-limits verification emails (2/hour on the built-in mailer); if
// that's the underlying error, the user will simply not receive a new email but
// the UI message stays generic.
export async function resendVerificationAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
  })
  if (error) {
    console.error('[resendVerificationAction] supabase error:', error.message)
  }
  return { success: true }
}

// AUTH-04: sign out from any page. revalidatePath('/', 'layout') busts the
// (public) layout's getClaims cache so the next render reflects the signed-out state.
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// AUTH-05a: send the password-reset email. redirectTo includes type=recovery so
// /auth/callback knows to route to /reset-password/update.
//
// T-02-02-05: do NOT leak email existence. Return success regardless of Supabase error
// to avoid user-enumeration; log internally for ops visibility.
export async function requestPasswordResetAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const parsed = passwordResetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
  })
  if (error) {
    console.error('[requestPasswordResetAction] supabase error:', error.message)
  }
  return { success: true }
}

// AUTH-05b: update the password after the recovery callback set the session cookie.
// getClaims() validates we still have a valid recovery session before updating.
export async function updatePasswordAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' }
  }

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (authError || !data?.claims) {
    return { error: 'Your reset link has expired. Please request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: 'Failed to update password. Please try again.' }
  }
  redirect('/dashboard')
}

// Inline change-password for an already-signed-in user (student dashboard Account section).
// No email link — uses the current SSR session cookie. Returns success/error for inline display.
export async function changePasswordAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid password.' }
  }

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getClaims()
  if (authError || !data?.claims) {
    return { error: 'You must be signed in to change your password.' }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    return { error: 'Failed to update password. Please try again.' }
  }
  return { success: true }
}

// Legacy magic-link action — retained for backward compat with old student
// links/bookmarks but no longer used for new sign-ins. Students now use
// email+password via signUpStudentAction / signInAction (password).
export async function signInWithOtpAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const result = z.string().email().safeParse(email)
  if (!result.success) {
    return { error: 'Please enter a valid email address.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: result.data,
    options: {
      shouldCreateUser: true,
      data: { role: 'student' },
      emailRedirectTo: `${SITE_URL}/auth/callback?type=magiclink`,
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || error.status === 429) {
      return { error: 'Too many requests. Please wait a few minutes before trying again.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
  return { success: true }
}

// Unified login — step 1: resolve which auth method an email should use.
// Uses the SECURITY DEFINER function public.resolve_login_method (00047) so anon
// can check role without service-role key. All known roles now use password
// (students migrated from magiclink to email+password); 'unknown' for no account.
// 'magiclink' is retained as a deprecated return value for backward compat.
export async function resolveLoginMethodAction(
  formData: FormData,
): Promise<{ method?: 'magiclink' | 'password' | 'unknown'; error?: string }> {
  const parsed = resolveLoginSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid email.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('resolve_login_method', {
    p_email: parsed.data.email,
  })
  if (error) {
    console.error('[resolveLoginMethodAction] rpc error:', error.message)
    return { error: 'Something went wrong. Please try again.' }
  }
  if (data === 'student' || data === 'coordinator' || data === 'admin') return { method: 'password' }
  return { method: 'unknown' }
}

// D-15: student sign-out lands on / (public home), NOT /login. Separate export
// keeps the coordinator signOutAction behavior unchanged.
export async function signOutStudentAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
