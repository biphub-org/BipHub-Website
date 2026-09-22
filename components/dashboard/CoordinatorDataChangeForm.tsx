'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { submitProfileChangeRequestAction } from '@/lib/actions/coordinator-profile-change'
import {
  coordinatorProfileChangeSchema,
  type CoordinatorProfileChangeValues,
} from '@/lib/schemas/coordinator-profile-change'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import type { UniversitySearchResult } from '@/lib/actions/universities'

/**
 * Coordinator data-change request form (/dashboard/settings).
 *
 * Proposes new profile values (full name, contact email, university, Erasmus
 * code) for admin review — NOTHING is applied on submit. An admin approves
 * or declines from /admin/coordinators/data-changes and the coordinator is
 * emailed the outcome.
 *
 * Contact email ≠ sign-in email: changing it updates the public contact
 * shown on the coordinator's BIPs, never the auth login — said verbatim
 * below so nobody files a request expecting a login change.
 */
export function CoordinatorDataChangeForm({
  initialUniversities,
  defaults,
}: {
  initialUniversities: UniversitySearchResult[]
  defaults: CoordinatorProfileChangeValues
}) {
  const form = useForm<CoordinatorProfileChangeValues>({
    resolver: zodResolver(coordinatorProfileChangeSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: CoordinatorProfileChangeValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      Object.entries(values).forEach(([k, v]) => fd.set(k, v as string))
      const result = await submitProfileChangeRequestAction(fd)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-border bg-bg-soft px-5 py-6 text-center">
        <h3 className="text-base font-semibold text-ink">Request sent for review</h3>
        <p className="mx-auto mt-2 max-w-[420px] text-sm text-muted leading-relaxed">
          An admin will approve or decline your data change — usually within a
          few days. We&apos;ll email your contact address once a decision is
          made. Your current details stay live until approval.
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
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Shown publicly as your contact on your BIPs. This does not
                change your sign-in email.
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
              <FormLabel>University</FormLabel>
              <FormControl>
                <UniversityCombobox
                  value={field.value || null}
                  onChange={(id, u) => {
                    field.onChange(id)
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
          name="erasmus_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Erasmus code</FormLabel>
              <FormControl>
                <Input placeholder="ABC UNI01" {...field} />
              </FormControl>
              <FormDescription>
                Your institution&apos;s Erasmus+ code (e.g. B BRUXEL01).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send for admin review →
        </Button>
      </form>
    </Form>
  )
}
