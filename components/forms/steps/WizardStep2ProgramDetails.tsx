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
import { DatePicker } from '@/components/ui/date-picker'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useBipDraft } from '@/lib/store/bip-draft'
import { step2Schema, type Step2Values } from '@/lib/schemas/bip-wizard'
import { VIRTUAL_TIMING_OPTIONS } from '@/lib/constants/virtual-timing'

const STUDY_LEVEL_OPTIONS: Array<{
  value: 'vocational' | 'bachelor' | 'master' | 'phd' | 'none'
  label: string
}> = [
  { value: 'vocational', label: 'Vocational Training · EQF level 5' },
  { value: 'bachelor', label: 'Bachelor · EQF level 6' },
  { value: 'master', label: 'Master · EQF level 7' },
  { value: 'phd', label: 'Doctorate · EQF level 8' },
  { value: 'none', label: 'None (Staff)' },
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
      // No fallback: an unset timing must stay empty so the required-field
      // error fires instead of a silently pre-picked value being submitted.
      virtual_timing: draft.virtual_timing,
      host_city: draft.host_city ?? '',
      physical_start_date: draft.physical_start_date ?? '',
      physical_end_date: draft.physical_end_date ?? '',
      application_deadline: draft.application_deadline ?? '',
      ects_credits: draft.ects_credits ?? 3,
      max_participants: draft.max_participants ?? 15,
      study_levels: (draft.study_levels ?? []) as Step2Values['study_levels'],
      language_of_instruction: draft.language_of_instruction ?? 'en',
      language_level_min: (draft.language_level_min ?? 'B1') as Step2Values['language_level_min'],
      virtual_session_dates:
        draft.virtual_session_dates && draft.virtual_session_dates.length > 0
          ? draft.virtual_session_dates
          : [''],
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
              <FormLabel>When do the virtual sessions run?</FormLabel>
              <FormControl>
                <select
                  className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                >
                  <option value="">Select when the sessions run…</option>
                  {VIRTUAL_TIMING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Relative to the physical mobility abroad. Required — students
                need to know whether the online work happens before they travel,
                while they are away, or after they return.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="virtual_session_dates"
          control={form.control}
          render={({ field }) => {
            const dates = field.value.length > 0 ? field.value : ['']
            const setAt = (index: number, value: string) => {
              const next = [...dates]
              next[index] = value
              field.onChange(next)
            }
            const addDate = () => field.onChange([...dates, ''])
            const removeAt = (index: number) =>
              field.onChange(dates.filter((_, i) => i !== index))
            return (
              <FormItem>
                <FormLabel>Virtual Session Dates</FormLabel>
                <div className="space-y-2">
                  {dates.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <FormControl>
                        <DatePicker
                          value={value}
                          onChange={(next) => setAt(index, next)}
                          onBlur={field.onBlur}
                          aria-label={`Virtual session date ${index + 1}`}
                        />
                      </FormControl>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeAt(index)}
                          className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-muted hover:text-eu-blue"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addDate}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-eu-blue hover:underline"
                >
                  + Add another date
                </button>
                <FormDescription>
                  Optional — leave blank if the individual session dates
                  aren&rsquo;t fixed yet. Blank rows are ignored.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
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
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-label="Physical mobility start date"
                  />
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
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-label="Physical mobility end date"
                  />
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
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-label="Application deadline"
                />
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
