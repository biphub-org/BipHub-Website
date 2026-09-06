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
import { CountrySelect } from '@/components/ui/country-select'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import { saveStudentProfileAction } from '@/lib/actions/profile'
import { studentProfileSchema, type StudentProfileValues } from '@/lib/schemas/profile'
import type { UniversitySearchResult } from '@/lib/actions/universities'

/**
 * StudentProfileForm — personal details for new registrations that predate
 * the fields, and for editing later. Full name + country required, home
 * university optional (clearable). On submit the Server Action saves the
 * profile and redirects to /student-dashboard.
 */
export function StudentProfileForm({
  initialFullName,
  initialCountry,
  initialUniversityId,
  initialUniversities,
}: {
  initialFullName: string
  initialCountry: string
  initialUniversityId: string
  initialUniversities: UniversitySearchResult[]
}) {
  const form = useForm<StudentProfileValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      full_name: initialFullName,
      country: initialCountry as StudentProfileValues['country'],
      university_id: initialUniversityId,
    },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: StudentProfileValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('full_name', values.full_name)
      fd.set('country', values.country)
      fd.set('university_id', values.university_id ?? '')
      const result = await saveStudentProfileAction(fd)
      if (result?.error) setServerError(result.error)
    })
  }

  const universityId = form.watch('university_id')

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
                <Input type="text" autoComplete="name" placeholder="Jane Smith" autoFocus {...field} />
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
              <FormDescription>
                Helps coordinators and admins recognise your institution.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save and continue →
        </Button>
      </form>
    </Form>
  )
}
