'use client'

import { useState, useEffect, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import {
  searchUniversitiesAction,
  addUniversityAction,
  type UniversitySearchResult,
} from '@/lib/actions/universities'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import { cn } from '@/lib/utils/cn'

/**
 * UniversityCombobox — searchable shadcn Command + Popover with an inline
 * "Add new university" subform (D-08).
 *
 * Search:
 *   - 250ms debounced via use-debounce; calls searchUniversitiesAction.
 *   - `shouldFilter={false}` on Command — server returns the filtered set.
 *
 * Add flow:
 *   - "Add `query` as a new university" rendered as the CommandEmpty body so
 *     the user lands there when no result matches.
 *   - Inline subform captures name + country + optional Erasmus code, then
 *     calls addUniversityAction (SECURITY DEFINER RPC). On success, the
 *     combobox refreshes results and selects the new row.
 */
interface Props {
  value: string | null // selected university id
  onChange: (id: string, university: UniversitySearchResult) => void
  initialUniversities: UniversitySearchResult[]
}

export function UniversityCombobox({
  value,
  onChange,
  initialUniversities,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] =
    useState<UniversitySearchResult[]>(initialUniversities)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCountry, setNewCountry] = useState<string>('')
  const [newErasmus, setNewErasmus] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, startAdding] = useTransition()

  // Selected display value comes from the union of initial + cached results so
  // the trigger label survives a fresh re-render with no popover open.
  const selected = [...initialUniversities, ...results].find(
    (u) => u.id === value,
  )

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    const next = await searchUniversitiesAction(q)
    setResults(next)
  }, 250)

  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])

  function handleAddUniversity() {
    setAddError(null)
    const fd = new FormData()
    fd.set('name', newName)
    fd.set('country', newCountry)
    if (newErasmus) fd.set('erasmus_code', newErasmus)
    startAdding(async () => {
      const result = await addUniversityAction(fd)
      if ('error' in result) {
        setAddError(result.error)
        return
      }
      // Refresh results so the new row is in the cache, then select it.
      const refreshed = await searchUniversitiesAction(newName)
      setResults(refreshed)
      const created = refreshed.find((u) => u.id === result.id)
      if (created) onChange(created.id, created)
      setShowAdd(false)
      setOpen(false)
      setNewName('')
      setNewCountry('')
      setNewErasmus('')
    })
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between border border-border"
            />
          }
        >
          {selected
            ? `${selected.name} (${selected.country})${selected.erasmus_code ? ` · ${selected.erasmus_code}` : ''}`
            : 'Search by name or Erasmus code…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={(v) => {
                setQuery(v)
                setShowAdd(false)
              }}
              placeholder="Search by name or Erasmus code…"
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdd(true)
                    setNewName(query)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-eu-blue hover:bg-bg-soft"
                >
                  <Plus className="h-4 w-4" />
                  Add &ldquo;{query}&rdquo; as a new university
                </button>
              </CommandEmpty>
              <CommandGroup>
                {results.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    onSelect={() => {
                      onChange(u.id, u)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === u.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="flex-1">
                      {u.name}
                      {u.erasmus_code && (
                        <span className="ml-2 text-xs text-muted">{u.erasmus_code}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted">{u.country}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {showAdd && (
        <div className="rounded-md border border-border bg-bg-soft p-4 space-y-3">
          <div className="text-sm font-semibold text-ink">New university</div>
          <Input
            placeholder="University name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Country…</option>
            {ERASMUS_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Erasmus code (optional)"
            value={newErasmus}
            onChange={(e) => setNewErasmus(e.target.value)}
          />
          {addError && (
            <div className="text-sm text-status-rejected">{addError}</div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isAdding}
              onClick={handleAddUniversity}
            >
              Add university
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
