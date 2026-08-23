'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

type CtxValue = {
  selected: Set<string>
  selectedIds: string[]
  toggle: (id: string, checked: boolean) => void
  toggleAll: (ids: string[], checked: boolean) => void
  clear: () => void
  setSelected: (next: Set<string>) => void
}

const AdminSelectionContext = createContext<CtxValue | null>(null)

export function AdminSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelectedState] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  // Clear selection on route change so stale ids don't leak across pages
  useEffect(() => {
    setSelectedState(new Set())
  }, [pathname])

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelectedState((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((ids: string[], checked: boolean) => {
    if (checked) setSelectedState(new Set(ids))
    else setSelectedState(new Set())
  }, [])

  const clear = useCallback(() => setSelectedState(new Set()), [])

  const setSelected = useCallback((next: Set<string>) => setSelectedState(new Set(next)), [])

  const selectedIds = Array.from(selected)

  return (
    <AdminSelectionContext.Provider value={{ selected, selectedIds, toggle, toggleAll, clear, setSelected }}>
      {children}
    </AdminSelectionContext.Provider>
  )
}

export function useAdminSelection(): CtxValue {
  const ctx = useContext(AdminSelectionContext)
  if (!ctx) throw new Error('useAdminSelection must be used within AdminSelectionProvider')
  return ctx
}
