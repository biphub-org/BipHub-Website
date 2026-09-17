'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
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
import { CountrySelect } from '@/components/ui/country-select'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import { signUpStudentAction } from '@/lib/actions/auth'
import { studentRegisterSchema, type StudentRegisterValues } from '@/lib/schemas/auth'
import type { UniversitySearchResult } from '@/lib/actions/universities'

/**
 * Student registration form — email + password + personal details, with
 * email verification. Full name and country are required; home university is
 * optional (clearable). On success the Server Action sends a verification
 * link and redirects to /verify-email — the student signs in only after
 * confirming their email.
 */
export function StudentRegisterForm({
  initialUniversities,
  initialEmail = '',
}: {
  initialUniversities: UniversitySearchResult[]
  initialEmail?: string
}) {
  const form = useForm<StudentRegisterValues>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      email: initialEmail,
      password: '',
      confirmPassword: '',
      full_name: '',
      country: '' as StudentRegisterValues['country'],
      university_id: '',
    },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: StudentRegisterValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      fd.set('password', values.password)
      fd.set('confirmPassword', values.confirmPassword)
      fd.set('full_name', values.full_name)
      fd.set('country', values.country)
      fd.set('university_id', values.university_id ?? '')
      const result = await signUpStudentAction(fd)
      if (result?.error) setServerError(result.error)
    })
  }

  const universityId = form.watch('university_id')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" autoFocus {...field} />
              </FormControl>
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
                <Input type="text" autoComplete="name" placeholder="Jane Smith" {...field} />
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
              <FormLabel>Country of residence</FormLabel>
              <FormControl>
                <CountrySelect value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="university_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Home university <span className="font-normal text-muted">(optional)</span>
              </FormLabel>
              <FormControl>
                <UniversityCombobox
                  value={field.value || null}
                  onChange={(id) => field.onChange(id)}
                  initialUniversities={initialUniversities}
                />
              </FormControl>
              {universityId ? (
                <button
                  type="button"
                  onClick={() => field.onChange('')}
                  className="text-xs font-medium text-eu-blue hover:underline"
                >
                  Clear university
                </button>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 8 characters.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted leading-relaxed">
          We&apos;ll send a verification link to your email — you&apos;ll sign in
          after confirming it.
        </p>

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account →
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-eu-blue font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </Form>
  )
}
