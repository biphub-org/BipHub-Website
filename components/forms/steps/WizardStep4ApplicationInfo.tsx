'use client'

/**
 * Wizard Step 4 — Application information (UI-SPEC line 293-298).
 *
 * Order (item 15): how-to-apply first, then Fees, Eligibility, Accommodation.
 * - how_to_apply_type radio: `url` reveals the URL field; `contact` reveals
 *   contact_name + contact_email + optional contact_phone. Conditional reveal
 *   animates with LazyMotion + m.div opacity transition (CLAUDE.md: never framer-motion).
 * - fees (required) / eligibility_notes / accommodation_notes textareas.
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBipDraft } from '@/lib/store/bip-draft'
import { step4Schema, type Step4Values } from '@/lib/schemas/bip-wizard'
import { BipAttachmentsField } from '@/components/forms/BipAttachmentsField'
import { BipCardImageField } from '@/components/forms/BipCardImageField'

interface Props {
  onContinue: (values: Step4Values) => void
  onAutoSave: (payload: Partial<Step4Values>) => void
}

/** Checkbox + title + explanation, matching the Step 3 partner-only control. */
function SupportCheckbox({
  testId,
  checked,
  onChange,
  title,
  description,
}: {
  testId: string
  checked: boolean
  onChange: (next: boolean) => void
  title: string
  description: string
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm text-ink">
      <Checkbox
        data-testid={testId}
        checked={checked}
        onCheckedChange={(next) => onChange(Boolean(next))}
      />
      <span>
        <span className="font-medium">{title}</span>
        <span className="mt-1 block text-xs text-muted">{description}</span>
      </span>
    </label>
  )
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
      contact_phone: draft.contact_phone ?? '',
      fees: draft.fees ?? '',
      eligibility_notes: draft.eligibility_notes ?? '',
      accommodation_notes: draft.accommodation_notes ?? '',
      green_travel: draft.green_travel ?? false,
      inclusion_support: draft.inclusion_support ?? false,
      card_image_path: draft.card_image_path ?? '',
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
        {/* How participants apply — first section (item 15). */}
        <FormField
          name="how_to_apply_type"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>How do participants apply?</FormLabel>
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
              <FormField
                name="contact_phone"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact phone (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+32 16 32 40 10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </m.div>
          )}
        </LazyMotion>

        {/* Fees — placed right below "How do participants apply" (item 17). */}
        <FormField
          name="fees"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fees</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Any participation fees and what they cover. If the programme is free, write “No fees”."
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

        {/* Funding & support — Erasmus+ grant top-ups. These are claimed from
            the participant's SENDING institution, so the wording asks whether
            they apply rather than implying the host pays them. */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">
            Funding & support (optional)
          </legend>
          <p className="text-xs text-muted">
            Tick these if participants can claim the Erasmus+ top-ups from their
            sending institution. Each one you tick appears as a card on the
            published BIP page.
          </p>
          <FormField
            name="green_travel"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <SupportCheckbox
                    // Stable e2e hook — the accessible name is descriptive copy.
                    testId="green-travel"
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    title="Green-travel top-up available"
                    description="Participants reaching the BIP by low-emission transport can claim extra Erasmus+ funding."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="inclusion_support"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <SupportCheckbox
                    testId="inclusion-support"
                    checked={Boolean(field.value)}
                    onChange={field.onChange}
                    title="Inclusion support available"
                    description="Participants with fewer opportunities can claim additional inclusion funding."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {/* Optional listing-card cover image. */}
        <FormField
          name="card_image_path"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <BipCardImageField
                  value={field.value ?? ''}
                  onChange={field.onChange}
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
