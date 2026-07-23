'use client'

/**
 * usePreviewAttachments — fetches a BIP's uploaded attachments for the Step 5
 * preview.
 *
 * Uploads attach directly to the BIP server-side (bip_attachments table), not to
 * the wizard's Zustand draft, so `draftToBipDetail` can't include them (it hard-
 * codes attachments: []). Without this the preview's Materials / "Visuals &
 * documents" section never renders even though the live page shows it. We reuse
 * the same listBipAttachmentsAction the builder field uses and reshape the rows
 * to the BipDetail.attachments contract.
 */

import { useEffect, useState } from 'react'
import { listBipAttachmentsAction } from '@/lib/actions/bip-attachments'
import type { BipDetail } from '@/lib/queries/bipDetail'

export function usePreviewAttachments(
  bipId: string | null,
): BipDetail['attachments'] {
  const [attachments, setAttachments] = useState<BipDetail['attachments']>([])

  useEffect(() => {
    if (!bipId) {
      setAttachments([])
      return
    }
    let active = true
    listBipAttachmentsAction(bipId).then((rows) => {
      if (!active) return
      setAttachments(
        rows.map((r) => ({
          id: r.id,
          storage_path: r.storage_path,
          file_name: r.file_name,
          mime_type: r.mime_type,
          kind: r.kind,
        })),
      )
    })
    return () => {
      active = false
    }
  }, [bipId])

  return attachments
}
