'use client'

/**
 * Wizard Step 1 — Basic information (UI-SPEC line 264-272).
 *
 * Fields: title, subject_areas (multi-select), description, learning_outcomes.
 *
 * - RHF + zodResolver(step1Schema); mode 'onBlur' to avoid per-keystroke noise.
 * - Every blurred change is mirrored into the Zustand draft store via
 *   `mergeDraft`, then handed to `onAutoSave` for the wizard's 1.5s debounce.
 * - The form's id is `wizard-step-1-form` so the wizard footer's submit button
 *   can target it via `<button form="wizard-step-1-form">`.
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useBipDraft } from '@/lib/store/bip-draft'
import { step1Schema, type Step1Values } from '@/lib/schemas/bip-wizard'
import { ISCED_FIELDS } from '@/lib/isced'

interface Props {
  onContinue: (values: Step1Values) => void
  onAutoSave: (payload: Partial<Step1Values>) => void
}

export function WizardStep1BasicInfo({ onContinue, onAutoSave }: Props) {
  const draft = useBipDraft((s) => s.draft)
  const mergeDraft = useBipDraft((s) => s.mergeDraft)

  const form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: draft.title ?? '',
      external_bip_id: draft.external_bip_id ?? '',
      target_group: (draft.target_group ?? undefined) as Step1Values['target_group'],
      subject_areas: (draft.subject_areas ?? []) as Step1Values['subject_areas'],
      description: draft.description ?? '',
      learning_outcomes: draft.learning_outcomes ?? '',
    },
    mode: 'onBlur',
  })

  // Mirror every change into the store + trigger debounced auto-save.
  useEffect(() => {
    const sub = form.watch((value) => {
      mergeDraft(value as Partial<Step1Values>)
      onAutoSave(value as Partial<Step1Values>)
    })
    return () => sub.unsubscribe()
  }, [form, mergeDraft, onAutoSave])

  const titleValue = form.watch('title') ?? ''

  return (
    <Form {...form}>
      <form
        id="wizard-step-1-form"
        onSubmit={form.handleSubmit(onContinue)}
        className="space-y-5"
      >
        <FormField
          name="title"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>BIP title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Sustainable Cities in Practice — KU Leuven Summer BIP 2026"
                  maxLength={500}
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormDescription>{titleValue.length}/500 characters</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="external_bip_id"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>BIP ID</FormLabel>
              <FormControl>
                <Input
                  placeholder="Official Erasmus+ BIP code"
                  maxLength={500}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The official Erasmus+ BIP code for this programme.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="target_group"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target group</FormLabel>
              <FormControl>
                <select
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                >
                  <option value="" disabled>
                    Select who this BIP is open to…
                  </option>
                  <option value="students">Students</option>
                  <option value="staff">Staff</option>
                  <option value="students_staff">Students/Staff</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="subject_areas"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fields of study</FormLabel>
              <FormDescription>
                Select every field this BIP covers — at least one.
              </FormDescription>
              <FormControl>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ISCED_FIELDS.map((f) => {
                    const current = (field.value ?? []) as string[]
                    const checked = current.includes(f.id)
                    return (
                      <label
                        key={f.id}
                        className="flex items-center gap-2 text-sm text-ink"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            if (next) {
                              if (!current.includes(f.id)) {
                                field.onChange([...current, f.id])
                              }
                            } else {
                              field.onChange(current.filter((v) => v !== f.id))
                            }
                          }}
                        />
                        {f.label}
                      </label>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Describe the BIP: what participants will study, the academic context, and what makes this programme unique."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="learning_outcomes"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Learning outcomes</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>
                What will participants be able to do or know after completing this BIP?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
