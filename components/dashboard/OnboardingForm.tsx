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
import { saveProfileAction } from '@/lib/actions/profile'
import { profileSchema, type ProfileValues } from '@/lib/schemas/profile'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import type { UniversitySearchResult } from '@/lib/actions/universities'

/**
 * OnboardingForm — AUTH-07 client form.
 *
 * - RHF + zodResolver(profileSchema) — same validation server- and client-side.
 * - mode: 'onBlur' (no per-keystroke validation; matches Plan 02-02 pattern).
 * - <UniversityCombobox> embeds the searchable picker + inline add flow.
 * - Selecting a university auto-fills the country field; the user can still
 *   override it (the country must match the chosen university's country
 *   downstream — Zod accepts any whitelisted Erasmus+ country at this layer).
 * - On submit, the Server Action saves the profile and `redirect('/dashboard')`s.
 */
interface Props {
  initialEmail: string
  initialUniversities: UniversitySearchResult[]
}

export function OnboardingForm({ initialEmail, initialUniversities }: Props) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      contact_email: initialEmail,
      university_id: '',
      country: '' as ProfileValues['country'],
      erasmus_code: '',
    },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: ProfileValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      Object.entries(values).forEach(([k, v]) => fd.set(k, v as string))
      const result = await saveProfileAction(fd)
      if (result?.error) setServerError(result.error)
    })
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
                <Input placeholder="Dr. Jane Smith" autoFocus {...field} />
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
                This is how coordinators and admins will reach you about your
                BIPs.
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
                    // Auto-fill country from the selected university — user
                    // can still override below if necessary.
                    form.setValue(
                      'country',
                      u.country as ProfileValues['country'],
                      { shouldValidate: true },
                    )
                    // Auto-fill erasmus code from the selected university — same
                    // behaviour as country. Clears when university has no code.
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
          Complete profile →
        </Button>
      </form>
    </Form>
  )
}
