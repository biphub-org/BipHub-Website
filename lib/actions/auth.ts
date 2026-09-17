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
import { mapLoginMethod, type LoginMethod } from '@/lib/auth/login-method'
import { backfillStudentProfileFromMetadata } from '@/lib/auth/student-profile'
import {
  loginSchema,
  studentRegisterSchema,
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

  // Students must verify their email before signing in. When Supabase email
  // confirmations are enabled, signInWithPassword above already fails with
  // 'Email not confirmed' (mapped below). This explicit check additionally
  // covers environments where the confirm-email toggle is off: an
  // unconfirmed student session is dropped here instead of being honoured.
  if (role === 'student') {
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user && !userData.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return {
        error:
          'Please verify your email before signing in. Check your inbox or resend the verification email.',
      }
    }
    // First-sign-in backfill: the registration details travel in
    // user_metadata and are normally materialised by /auth/callback — but
    // with the default Supabase email template GoTrue consumes the token
    // itself, so the callback never runs. Completing the row here (when it
    // is still bare and the metadata holds the details) means a verified
    // student lands on a complete dashboard instead of one asking
    // for data we already hold.
    if (userData.user && claims?.sub) {
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name, country')
        .eq('id', claims.sub)
        .maybeSingle()
      const row = (studentProfile ?? {}) as {
        full_name?: string | null
        country?: string | null
      }
      if (!row.full_name || !row.country) {
        const status = await backfillStudentProfileFromMetadata(
          supabase,
          userData.user.id,
          userData.user.email ?? null,
          (userData.user.user_metadata ?? {}) as Record<string, unknown>,
        )
        console.log('[signInAction] student backfill:', status)
      }
    }
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

// Student registration: email + password + personal details WITH email
// verification. The student must confirm their email (verification link)
// before they can sign in — no session is established here.
//
// Because the verification click may happen in a different browser (or days
// later), the personal details cannot be written with the new user's session
// at signup time. They travel in `options.data` (user_metadata) instead and
// are materialised into profiles by /auth/callback after verification — with
// a first-sign-in backfill in signInAction as safety net for link formats
// that never reach the callback (see lib/auth/student-profile.ts).
// handle_new_user still creates the bare profiles row with role='student'
// from data.role at signup.
export async function signUpStudentAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = studentRegisterSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    full_name: formData.get('full_name'),
    country: formData.get('country'),
    university_id: formData.get('university_id'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  if (parsed.data.university_id) {
    const supabase = await createClient()
    const { data: uni } = await supabase
      .from('universities')
      .select('id')
      .eq('id', parsed.data.university_id)
      .maybeSingle()
    if (!uni) {
      return { error: 'The selected university is no longer available. Please choose another.' }
    }
  }

  const supabase = await createClient()
  const { error: signUpError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        role: 'student',
        full_name: parsed.data.full_name,
        country: parsed.data.country,
        university_id: parsed.data.university_id ?? null,
      },
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  })
  if (signUpError) {
    const msg = signUpError.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('user already')) {
      return { error: 'An account with this email already exists. Sign in instead?' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }

  // No sign-in here by design: the account stays unconfirmed until the
  // verification link is clicked, and signInAction refuses unconfirmed
  // students. /verify-email explains the next step + offers a resend.
  redirect('/verify-email?email=' + encodeURIComponent(parsed.data.email))
}

// Resend the signup verification email for users who didn't receive (or lost) the
// first one. Validates the email server-side so the button on /verify-email can't
// be repurposed to spam arbitrary addresses. Mirrors the signup emailRedirectTo
// (/auth/callback) so the PKCE callback lands the same way.
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

  // TEMPORARY PAUSE until the biphub.org business email is set up
  // (Supabase SMTP). Still returns success to preserve the T-02-02-05
  // no-enumeration contract. Re-enable by setting EMAIL_SENDING_ENABLED=true,
  // then delete this block.
  if (process.env.EMAIL_SENDING_ENABLED !== 'true') {
    console.log('[EMAIL PAUSED] skipping verification resend for', email)
    return { success: true }
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

  // TEMPORARY PAUSE until the biphub.org business email is set up
  // (Supabase SMTP). Still returns success to preserve the T-02-02-05
  // no-enumeration contract. Re-enable by setting EMAIL_SENDING_ENABLED=true,
  // then delete this block.
  if (process.env.EMAIL_SENDING_ENABLED !== 'true') {
    console.log('[EMAIL PAUSED] skipping password reset for', parsed.data.email)
    return { success: true }
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

// Magic-link dispatch for EXISTING students only — shouldCreateUser is false
// so unknown emails get a "no account" error instead of silently creating
// bare profiles (no complete-profile flow exists to fill them anymore).
// Used by StudentMagicLinkForm + the login-form resend.
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
      shouldCreateUser: false,
      data: { role: 'student' },
      emailRedirectTo: `${SITE_URL}/auth/callback?type=magiclink`,
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || error.status === 429) {
      return { error: 'Too many requests. Please wait a few minutes before trying again.' }
    }
    // shouldCreateUser:false — GoTrue reports unknown emails as not-found.
    if (msg.includes('not found')) {
      return { error: 'No account found for this email. Create a student account to get started.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
  return { success: true }
}

// Unified login — step 1: resolve which auth method an email should use.
// Uses the SECURITY DEFINER function public.resolve_login_method (00047,
// extended in 00054 with coordinator-request states) so anon can check
// without a service-role key. Account roles use password; a coordinator
// request with no account yet resolves to pending/rejected/approved so the
// login form can explain the review state; 'unknown' for no account.
// 'magiclink' is retained as a deprecated return value for backward compat.
export async function resolveLoginMethodAction(
  formData: FormData,
): Promise<{ method?: LoginMethod | 'magiclink'; error?: string }> {
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
  if (data === 'magiclink') return { method: 'magiclink' }
  return { method: mapLoginMethod(data as string | null) }
}

// D-15: student sign-out lands on / (public home), NOT /login. Separate export
// keeps the coordinator signOutAction behavior unchanged.
export async function signOutStudentAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
