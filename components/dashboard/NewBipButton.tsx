'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function NewBipButton() {
  return (
    <Link
      href="/dashboard/bips/new"
      onClick={() => {
        try {
          sessionStorage.setItem('biphub:clearNextDraft', '1')
        } catch {}
        try {
          localStorage.removeItem('biphub:draft')
        } catch {}
      }}
    >
      <Button variant="gold" size="md" className="font-semibold">
        + Submit a BIP
      </Button>
    </Link>
  )
}
