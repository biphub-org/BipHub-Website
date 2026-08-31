'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { signInAction, signInWithOtpAction, resolveLoginMethodAction } from '@/lib/actions/auth'
import { loginSchema, resolveLoginSchema, type LoginValues } from '@/lib/schemas/auth'

type Step = 'email' | 'password' | 'magiclink-sent' | 'unknown'

export function LoginForm({ initialError }: { initialError?: string }) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(initialError ?? null)
  const [isPending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const confirmHeadingRef = useRef<HTMLHeadingElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(resolveLoginSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  const passwordForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (step === 'magiclink-sent') confirmHeadingRef.current?.focus()
    if (step === 'password') {
      // focus password after transition
      setTimeout(() => passwordInputRef.current?.focus(), 50)
    }
  }, [step])

  function handleEmailSubmit(values: { email: string }) {
    const trimmed = values.email.trim().toLowerCase()
    setServerError(null)
    setResendMessage(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', trimmed)
      const resolved = await resolveLoginMethodAction(fd)
      if (resolved.error) {
        setServerError(resolved.error)
        return
      }
      setEmail(trimmed)

      // All known accounts now use password (students migrated from magiclink).
      // Keep magiclink branch for backward compat with cached deployments.
      if (resolved.method === 'magiclink' || resolved.method === 'password') {
        passwordForm.setValue('email', trimmed)
        passwordForm.setValue('password', '')
        setStep('password')
        return
      }
      // unknown
      setStep('unknown')
    })
  }

  function handlePasswordSubmit(values: LoginValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      fd.set('password', values.password)
      const result = await signInAction(fd)
      if (result?.error) setServerError(result.error)
    })
  }

  function handleResend() {
    if (cooldown > 0 || isPending) return
    setResendMessage(null)
    const fd = new FormData()
    fd.set('email', email)
    startTransition(async () => {
      const result = await signInWithOtpAction(fd)
      if (result.error) {
        setResendMessage(result.error)
        return
      }
      setResendMessage('Sent — check your inbox.')
      setCooldown(30)
      const tick = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(tick)
            return 0
          }
          return c - 1
        })
      }, 1000)
    })
  }

  function backToEmail() {
    setStep('email')
    setServerError(null)
    setResendMessage(null)
    setCooldown(0)
    emailForm.setValue('email', email)
  }

  // Magic-link sent confirmation (reuses StudentMagicLinkForm State B)
  if (step === 'magiclink-sent') {
    return (
      <div className="flex flex-col items-center text-center gap-4">
        <h1
          ref={confirmHeadingRef}
          tabIndex={-1}
          className="text-[22px] font-semibold tracking-[-0.3px] text-ink outline-none"
        >
          Check your email
        </h1>
        <p className="text-sm text-ink-2 leading-relaxed max-w-[320px]">
          We&apos;ve sent a sign-in link to <span className="font-semibold">{email}</span>.
          Click the link to sign in — it expires in 1 hour.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-sm text-muted">Didn&apos;t receive it?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending || cooldown > 0}
            className="text-sm text-eu-blue font-semibold hover:underline disabled:opacity-50 p-2 -m-2"
            aria-label="Resend sign-in link"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : isPending ? 'Sending…' : 'Resend sign-in link'}
          </button>
          {resendMessage && <p className="text-sm text-muted">{resendMessage}</p>}
        </div>
        <div className="mt-2 flex flex-col items-center gap-1">
          <p className="text-sm text-muted">Wrong email?</p>
          <button
            type="button"
            onClick={backToEmail}
            className="text-sm text-eu-blue font-semibold hover:underline p-2 -m-2"
          >
            Re-enter your email →
          </button>
        </div>
      </div>
    )
  }

  // Unknown email — offer both registration paths (no magic-link)
  if (step === 'unknown') {
    return (
      <div className="flex flex-col gap-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-lg border border-border bg-bg-soft p-4 text-center">
          <p className="text-sm font-medium text-ink">No account found for {email}</p>
          <p className="mt-1 text-sm text-muted">How would you like to continue?</p>
        </div>
        <div className="grid gap-3">
          <Link
            href="/register/student"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-eu-blue px-5 text-sm font-semibold text-white transition-all hover:bg-eu-blue-dark"
          >
            Create student account →
          </Link>
          <Link
            href="/register/coordinator"
            className="inline-flex h-11 w-full items-center justify-center rounded-pill border border-border bg-white px-5 text-sm font-semibold text-ink hover:bg-bg-soft transition-colors"
          >
            Create coordinator account →
          </Link>
        </div>
        <button
          type="button"
          onClick={backToEmail}
          className="text-sm text-eu-blue font-semibold hover:underline text-center"
        >
          ← Use a different email
        </button>
      </div>
    )
  }

  // Password step — coordinator/admin
  if (step === 'password') {
    return (
      <Form {...passwordForm}>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border bg-bg-soft px-3 py-2">
            <span className="text-sm text-ink truncate">{email}</span>
            <button
              type="button"
              onClick={backToEmail}
              className="ml-2 shrink-0 text-xs font-semibold text-eu-blue hover:underline"
            >
              Change
            </button>
          </div>
          <FormField
            control={passwordForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...field}
                    ref={(el) => {
                      field.ref(el)
                      // keep local ref for autoFocus
                      ;(passwordInputRef as unknown as { current: HTMLInputElement | null }).current = el
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-right">
            <Link href="/reset-password" className="text-sm text-eu-blue hover:underline">
              Forgot your password?
            </Link>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in →
          </Button>
        </form>
      </Form>
    )
  }

  // Default: email step
  return (
    <Form {...emailForm}>
      <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={emailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" autoFocus placeholder="you@university.edu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continue →
        </Button>
      </form>
    </Form>
  )
}
