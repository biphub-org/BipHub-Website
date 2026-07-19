'use client'

/**
 * DatePicker — a form-friendly replacement for `<input type="date">`.
 *
 * Native date inputs render in the browser/OS locale format and cannot be
 * styled to show "10th January 2026". This control shows the value via
 * `formatLongDate` on a button, opening a Calendar popover to pick a date.
 *
 * Value contract: a `YYYY-MM-DD` string (or '' when empty) — identical to what
 * the old `<input type="date">` produced, so schema + persistence are unchanged.
 * Dates are parsed/serialized in LOCAL time (calendar days, not instants) so the
 * chosen day never drifts by a timezone offset.
 *
 * Wrapped in `React.forwardRef` and spreading `...rest` onto the trigger button
 * so shadcn's `<FormControl>` (Radix Slot) can inject `id`, `aria-describedby`,
 * `aria-invalid`, and its ref for proper error/description association.
 */

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils/cn'
import { formatLongDate } from '@/lib/utils/dates'

interface DatePickerProps
  extends Omit<React.ComponentProps<'button'>, 'value' | 'onChange' | 'onBlur'> {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
}

/** 'YYYY-MM-DD' -> local Date (undefined when empty/invalid). */
function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

/** Local Date -> 'YYYY-MM-DD'. */
function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      onChange,
      onBlur,
      placeholder = 'Select a date',
      disabled,
      className,
      ...rest
    },
    ref,
  ) {
    const [open, setOpen] = React.useState(false)
    const selected = parseDate(value)
    const label = formatLongDate(value)
    // Bound the year dropdown: last year through five years out covers past
    // deadlines still being edited and mobility scheduled well ahead.
    const currentYear = new Date().getFullYear()
    const startMonth = new Date(currentYear - 1, 0)
    const endMonth = new Date(currentYear + 5, 11)

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) onBlur?.()
        }}
      >
        <PopoverTrigger
          render={
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              className={cn(
                'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none md:text-sm',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                !label && 'text-muted-foreground',
                className,
              )}
              {...rest}
            />
          }
        >
          <span className="truncate">{label ?? placeholder}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={endMonth}
            onSelect={(date) => {
              if (date) onChange(toISODate(date))
              setOpen(false)
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    )
  },
)
