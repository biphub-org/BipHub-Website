import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CountrySelect } from '@/components/ui/country-select'
import { ERASMUS_COUNTRIES } from '@/lib/countries'

describe('CountrySelect — real countries only', () => {
  it('lists every Erasmus country with no placeholder entry', () => {
    render(<CountrySelect value="BE" onChange={() => {}} />)
    const options = screen.getAllByRole('option') as HTMLOptionElement[]
    expect(options.map((o) => o.value)).toEqual(
      ERASMUS_COUNTRIES.map((c) => c.code),
    )
  })
})
