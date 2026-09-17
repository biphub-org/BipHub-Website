'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { submitCoordinatorRequestAction } from '@/lib/actions/coordinator-requests'
import {
  coordinatorRequestSchema,
  type CoordinatorRequestValues,
} from '@/lib/schemas/coordinator-request'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import type { UniversitySearchResult } from '@/lib/actions/universities'

/**
 * Coordinator access-request form.
 *
 * Collects the same details as the coordinator onboarding page (full name,
 * contact email, university, country, Erasmus code) PLUS the login `email`
 * the account will use once approved. No password is set here — approved
 * coordinators receive an invite link to set it.
 *
 * On success the form is replaced with an under-review confirmation (the
 * requester has no session, so there is nowhere to redirect them to).
 */
export function CoordinatorRequestForm({
  initialUniversities,
  initialEmail = '',
}: {
  initialUniversities: UniversitySearchResult[]
  initialEmail?: string
}) {
  const form = useForm<CoordinatorRequestValues>({
    resolver: zodResolver(coordinatorRequestSchema),
    defaultValues: {
      email: initialEmail,
      full_name: '',
      contact_email: '',
      university_id: '',
      country: '' as CoordinatorRequestValues['country'],
      erasmus_code: '',
    },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: CoordinatorRequestValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      Object.entries(values).forEach(([k, v]) => fd.set(k, v as string))
      const result = await submitCoordinatorRequestAction(fd)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <MailCheck className="text-eu-blue" size={32} aria-hidden />
        <h2 className="text-lg font-semibold text-ink">Request received</h2>
        <p className="text-sm text-muted leading-relaxed max-w-[340px]">
          Your submission is under review. We&apos;ll email you once an admin
          approves it — then you&apos;ll set your password and sign in.
        </p>
        <p className="text-sm text-muted">
          Trying to sign in before then will show the same &quot;under
          review&quot; status.
        </p>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" autoFocus placeholder="you@university.edu" {...field} />
              </FormControl>
              <FormDescription>
                This becomes your sign-in email once your request is approved.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Dr. Jane Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormDescription>
                How coordinators and admins will reach you about your BIPs.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="university_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your university</FormLabel>
              <FormControl>
                <UniversityCombobox
                  value={field.value || null}
                  onChange={(id, u) => {
                    field.onChange(id)
                    form.setValue(
                      'country',
                      u.country as CoordinatorRequestValues['country'],
                      { shouldValidate: true },
                    )
                    form.setValue('erasmus_code', u.erasmus_code ?? '', {
                      shouldValidate: true,
                    })
                  }}
                  initialUniversities={initialUniversities}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="">Country…</option>
                  {ERASMUS_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="erasmus_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Erasmus code</FormLabel>
              <FormControl>
                <Input placeholder="ABC UNI01" {...field} />
              </FormControl>
              <FormDescription>
                Your institution&apos;s Erasmus+ code (e.g. B BRUXEL01). Found
                in your Erasmus+ agreement.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit request →
        </Button>
      </form>
    </Form>
  )
}
