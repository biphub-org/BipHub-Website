'use client'

import { useState } from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { BipFiltersSidebar } from '@/components/bip/BipFiltersSidebar'
import type { BipFilterState } from '@/lib/filters/parseSearchParams'
import { Button } from '@/components/ui/button'
import { IconAdjustments } from '@tabler/icons-react'

export function BipFiltersDrawer({
  filters,
  totalResults,
}: {
  filters: BipFilterState
  totalResults: number
}) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (filters.country?.length ?? 0) +
    (filters.field?.length ?? 0) +
    (filters.lang?.length ?? 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.status && filters.status !== 'any' ? 1 : 0) +
    (filters.level?.length ?? 0) +
    (!!filters.partnerOnly ? 1 : 0)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open filters">
          <IconAdjustments size={16} aria-hidden="true" />
          <span>Filters{activeCount > 0 ? ` · ${activeCount}` : ''}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">Done</Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">
          <BipFiltersSidebar filters={filters} />
        </div>
        <DrawerFooter className="flex flex-row gap-3 border-t border-border">
          <DrawerClose asChild>
            <Button variant="ghost" className="flex-1">Clear all</Button>
          </DrawerClose>
          <DrawerClose asChild>
            <Button className="flex-1">
              Show {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
