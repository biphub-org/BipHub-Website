'use client'

/**
 * Wizard Step 4 — Application information (UI-SPEC line 293-298).
 *
 * Order (item 15): how-to-apply first, then Fees, Eligibility, Accommodation.
 * - how_to_apply_type radio: `url` reveals the URL field; `contact` reveals
 *   contact_name + contact_email pair. Conditional reveal animates with
 *   LazyMotion + m.div opacity transition (CLAUDE.md: never framer-motion).
 * - fees / eligibility_notes / accommodation_notes textareas (all optional).
 *
 * Schema-level refinement enforces that exactly one application channel is
 * filled in (URL or both contact fields).
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LazyMotion, domAnimation, m } from 'motion/react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBipDraft } from '@/lib/store/bip-draft'
import { step4Schema, type Step4Values } from '@/lib/schemas/bip-wizard'
import { BipAttachmentsField } from '@/components/forms/BipAttachmentsField'

interface Props {
  onContinue: (values: Step4Values) => void
  onAutoSave: (payload: Partial<Step4Values>) => void
}

export function WizardStep4ApplicationInfo({ onContinue, onAutoSave }: Props) {
  const draft = useBipDraft((s) => s.draft)
  const mergeDraft = useBipDraft((s) => s.mergeDraft)

  const form = useForm<Step4Values>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      how_to_apply_type: (draft.how_to_apply_type ?? 'url') as Step4Values['how_to_apply_type'],
      how_to_apply_url: draft.how_to_apply_url ?? '',
      contact_name: draft.contact_name ?? '',
      contact_email: draft.contact_email ?? '',
      fees: draft.fees ?? '',
      eligibility_notes: draft.eligibility_notes ?? '',
      accommodation_notes: draft.accommodation_notes ?? '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    const sub = form.watch((value) => {
      mergeDraft(value as Partial<Step4Values>)
      onAutoSave(value as Partial<Step4Values>)
    })
    return () => sub.unsubscribe()
  }, [form, mergeDraft, onAutoSave])

  const applyType = form.watch('how_to_apply_type')

  return (
    <Form {...form}>
      <form
        id="wizard-step-4-form"
        onSubmit={form.handleSubmit(onContinue)}
        className="space-y-5"
      >
        {/* How students/staff apply — first section (item 15). */}
        <FormField
          name="how_to_apply_type"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>How do students/staff apply?</FormLabel>
              <FormControl>
                <div className="flex gap-4 text-sm text-ink">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="url"
                      checked={field.value === 'url'}
                      onChange={() => field.onChange('url')}
                    />
                    Application URL
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="contact"
                      checked={field.value === 'contact'}
                      onChange={() => field.onChange('contact')}
                    />
                    Coordinator contact
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <LazyMotion features={domAnimation}>
          {applyType === 'url' ? (
            <m.div
              key="url"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <FormField
                name="how_to_apply_url"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://your-university.eu/bips/apply"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </m.div>
          ) : (
            <m.div
              key="contact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <FormField
                name="contact_name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact name</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="contact_email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </m.div>
          )}
        </LazyMotion>

        {/* Fees — placed right below "How do students/staff apply" (item 17). */}
        <FormField
          name="fees"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fees (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Any participation fees, and what they cover — leave blank if there are none."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="eligibility_notes"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eligibility notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Any prerequisites, application requirements, or selection criteria."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="accommodation_notes"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accommodation notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Housing, cost, or booking guidance for participants — leave blank if not offered."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Optional program media/documents (item 18). */}
        <BipAttachmentsField />
      </form>
    </Form>
  )
}
