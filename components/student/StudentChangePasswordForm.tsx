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
import { changePasswordAction } from '@/lib/actions/auth'
import { passwordUpdateSchema, type PasswordUpdateValues } from '@/lib/schemas/auth'

/**
 * Inline change-password form for the student dashboard Account section.
 * Uses the authenticated session (no email link) to update the password directly.
 * On success shows a confirmation message; on failure shows the server error.
 */
export function StudentChangePasswordForm() {
  const form = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onBlur',
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: PasswordUpdateValues) {
    setServerError(null)
    setSuccess(false)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('password', values.password)
      fd.set('confirmPassword', values.confirmPassword)
      const result = await changePasswordAction(fd)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      if (result?.success) {
        setSuccess(true)
        form.reset()
      }
    })
  }

  return (
    <div className="rounded-lg border border-border bg-bg-soft p-4">
      <h3 className="text-sm font-semibold text-ink">Change password</h3>
      <p className="mt-1 text-xs text-muted">Update your password. At least 8 characters.</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>Password updated successfully.</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
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
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" variant="primary" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </Form>
    </div>
  )
}
