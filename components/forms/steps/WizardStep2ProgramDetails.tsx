'use client'

/**
 * Wizard Step 2 — Programme details (UI-SPEC line 274-285).
 *
 * Fields: virtual component description + timing, host city, three dates
 * (physical_start_date / physical_end_date / application_deadline), ECTS
 * credits, max participants, study levels, language of instruction + minimum
 * CEFR level.
 *
 * Same form-watch + debounced auto-save pattern as Step 1. Cross-field
 * refinements (`physical_start < physical_end`, `deadline < physical_start`)
 * live in `step2Schema` and surface as field-level errors.
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
import { step2Schema, type Step2Values } from '@/lib/schemas/bip-wizard'

const STUDY_LEVEL_OPTIONS: Array<{
  value: 'bachelor' | 'master' | 'phd' | 'vocational'
  label: string
}> = [
  { value: 'bachelor', label: 'Bachelor · EQF 6' },
  { value: 'master', label: 'Master · EQF 7' },
  { value: 'phd', label: 'Doctorate · EQF 8' },
  { value: 'vocational', label: 'Vocational Training · EQF 5' },
]

const LANGUAGE_LEVEL_OPTIONS: Array<{
  value: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'none'
  label: string
}> = [
  { value: 'none', label: 'No requirement' },
  { value: 'A1', label: 'A1 (Beginner)' },
  { value: 'A2', label: 'A2 (Elementary)' },
  { value: 'B1', label: 'B1 (Intermediate)' },
  { value: 'B2', label: 'B2 (Upper-intermediate)' },
  { value: 'C1', label: 'C1 (Advanced)' },
  { value: 'C2', label: 'C2 (Proficient)' },
]

interface Props {
  onContinue: (values: Step2Values) => void
  onAutoSave: (payload: Partial<Step2Values>) => void
}

export function WizardStep2ProgramDetails({ onContinue, onAutoSave }: Props) {
  const draft = useBipDraft((s) => s.draft)
  const mergeDraft = useBipDraft((s) => s.mergeDraft)

  const form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      virtual_component_description: draft.virtual_component_description ?? '',
      virtual_timing: (draft.virtual_timing ?? 'before') as Step2Values['virtual_timing'],
      host_city: draft.host_city ?? '',
      physical_start_date: draft.physical_start_date ?? '',
      physical_end_date: draft.physical_end_date ?? '',
      application_deadline: draft.application_deadline ?? '',
      ects_credits: draft.ects_credits ?? 3,
      max_participants: draft.max_participants ?? 15,
      study_levels: (draft.study_levels ?? []) as Step2Values['study_levels'],
      language_of_instruction: draft.language_of_instruction ?? 'en',
      language_level_min: (draft.language_level_min ?? 'B1') as Step2Values['language_level_min'],
      virtual_session_date: draft.virtual_session_date ?? '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    const sub = form.watch((value) => {
      mergeDraft(value as Partial<Step2Values>)
      onAutoSave(value as Partial<Step2Values>)
    })
    return () => sub.unsubscribe()
  }, [form, mergeDraft, onAutoSave])

  return (
    <Form {...form}>
      <form
        id="wizard-step-2-form"
        onSubmit={form.handleSubmit(onContinue)}
        className="space-y-5"
      >
        <FormField
          name="virtual_component_description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Virtual Component Description</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Describe the online sessions, group work, or asynchronous learning that complement the physical exchange."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Required for every BIP. The virtual component is what makes a BIP &ldquo;blended&rdquo;.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="virtual_timing"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>When does the virtual component run?</FormLabel>
              <FormControl>
                <select
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                >
                  <option value="before">Before physical mobility</option>
                  <option value="during">During physical mobility</option>
                  <option value="after">After physical mobility</option>
                  <option value="before_and_after">Before and after physical mobility</option>
                  <option value="mixed">Mixed / throughout</option>
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="virtual_session_date"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Virtual Session Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>Optional — the date the virtual session runs.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="host_city"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host city</FormLabel>
              <FormControl>
                <Input placeholder="Leuven" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="physical_start_date"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Physical Mobility Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="physical_end_date"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Physical Mobility End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="application_deadline"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application deadline</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="ects_credits"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>ECTS credits</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={30} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="max_participants"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Number of Participants</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={100} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="study_levels"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Study levels</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-4">
                  {STUDY_LEVEL_OPTIONS.map((opt) => {
                    const checked = (field.value ?? []).includes(opt.value)
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-2 text-sm text-ink"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const current = (field.value ?? []) as Array<typeof opt.value>
                            if (next) {
                              if (!current.includes(opt.value)) {
                                field.onChange([...current, opt.value])
                              }
                            } else {
                              field.onChange(current.filter((v) => v !== opt.value))
                            }
                          }}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            name="language_of_instruction"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Language of instruction</FormLabel>
                <FormControl>
                  <Input
                    placeholder="EN"
                    maxLength={10}
                    className="uppercase placeholder:normal-case"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormDescription>
                  ISO 639-1 code, e.g. <code>EN</code>, <code>FR</code>, <code>DE</code>.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="language_level_min"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum CEFR level</FormLabel>
                <FormControl>
                  <select
                    className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                  >
                    {LANGUAGE_LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  )
}
