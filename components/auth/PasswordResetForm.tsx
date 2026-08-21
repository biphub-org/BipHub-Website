'use client'

import { useState, useTransition } from 'react'
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
import { requestPasswordResetAction } from '@/lib/actions/auth'
import {
  passwordResetSchema,
  type PasswordResetValues,
} from '@/lib/schemas/auth'

/**
 * AUTH-05a request-password-reset form.
 *
 * On `result.success` we replace the form with a static confirmation card.
 * The Server Action returns `{ success: true }` regardless of whether the
 * email exists (T-02-02-05: no enumeration).
 */
export function PasswordResetForm() {
  const form = useForm<PasswordResetValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: PasswordResetValues) {
    setServerError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('email', values.email)
      const result = await requestPasswordResetAction(fd)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      if (result?.success) setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-ink">Check your email</h2>
        <p className="text-sm text-muted">
          Check your email for a reset link. It expires in 1 hour.
        </p>
      </div>
    )
  }

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

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link →
        </Button>
      </form>
    </Form>
  )
}
