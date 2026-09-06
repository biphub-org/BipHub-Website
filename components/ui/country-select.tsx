import { ERASMUS_COUNTRIES } from '@/lib/countries'

/**
 * CountrySelect — native select over ERASMUS_COUNTRIES.
 *
 * Shared by student registration and student profile completion. Native select
 * (not shadcn) matches the existing OnboardingForm/UniversityCombobox pattern:
 * zero JS, accessible, works without client state beyond value/onChange.
 */
export function CountrySelect({
  value,
  onChange,
  id,
  ariaLabel,
}: {
  value: string
  onChange: (code: string) => void
  id?: string
  ariaLabel?: string
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
    >
      <option value="">Country…</option>
      {ERASMUS_COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
